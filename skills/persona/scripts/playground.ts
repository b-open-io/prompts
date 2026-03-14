import { Hono } from "hono";
import {
  readFileSync,
  appendFileSync,
  existsSync,
  statSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { resolve, dirname, extname } from "path";

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
let dataPath = "";
let port = 4747;
let autoOpen = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--data" && args[i + 1]) {
    dataPath = resolve(args[i + 1]);
    i++;
  } else if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--open") {
    autoOpen = true;
  }
}

if (!dataPath) {
  console.error(
    "Usage: bun run playground.ts --data /path/to/post.json [--port 4747] [--open]"
  );
  process.exit(1);
}

if (!existsSync(dataPath)) {
  console.error(`Data file not found: ${dataPath}`);
  process.exit(1);
}

const eventsPath = dataPath + ".events";

// ── Data types ──────────────────────────────────────────────────────
interface Part {
  text: string;
  image_prompt?: string;
}

interface PostData {
  parts?: Part[];
  text?: string;
  image_prompt?: string;
  thread?: Part[];
  username?: string;
  image?: string;
  avatar?: string;
}

interface ProfileData {
  parts: Part[];
  username: string;
  image: string;
  avatar: string;
}

// ── Data helpers ────────────────────────────────────────────────────
function readPostData(): ProfileData {
  const raw = readFileSync(dataPath, "utf-8");
  const data: PostData = JSON.parse(raw);

  let parts: Part[];
  if (data.parts?.length) {
    parts = data.parts;
  } else if (data.thread?.length) {
    parts = data.thread;
  } else if (data.text) {
    parts = [{ text: data.text, image_prompt: data.image_prompt }];
  } else {
    parts = [{ text: "" }];
  }

  return {
    parts: parts.map((p) => ({
      text: p.text || "",
      image_prompt: p.image_prompt || "",
    })),
    username: data.username || "wildsatchmo",
    image: data.image || "",
    avatar: data.avatar || "",
  };
}

// ── Token resolution (mirrors x-token.sh logic) ────────────────────
async function resolveXToken(): Promise<string> {
  const candidates = [
    process.env.X_BEARER_TOKEN,
    process.env.X_ACCESS_TOKEN,
  ].filter(Boolean) as string[];

  for (const token of candidates) {
    try {
      const res = await fetch(
        "https://api.x.com/2/users/by/username/twitter",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) return token;
    } catch {
      continue;
    }
  }

  // Try OAuth refresh
  const refreshToken = process.env.X_REFRESH_TOKEN;
  const clientId = process.env.X_CLIENT_SECRET_ID;
  if (refreshToken && clientId) {
    try {
      const res = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}`,
      });
      const body = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (body.access_token) {
        process.env.X_ACCESS_TOKEN = body.access_token;
        if (body.refresh_token)
          process.env.X_REFRESH_TOKEN = body.refresh_token;
        return body.access_token;
      }
    } catch {}
  }

  return "";
}

// Fetch X profile avatar on startup
let cachedAvatar = "";
async function fetchAvatar(username: string): Promise<string> {
  if (cachedAvatar) return cachedAvatar;

  // First check if the persona profile has an avatar
  const personaDir = process.env.PERSONA_DIR || ".claude/persona";
  const profilePath = resolve(personaDir, `${username}.json`);
  if (existsSync(profilePath)) {
    try {
      const profile = JSON.parse(readFileSync(profilePath, "utf-8"));
      if (profile.avatar) {
        cachedAvatar = profile.avatar;
        return cachedAvatar;
      }
    } catch {}
  }

  // Fall back to API call with token resolution
  const token = await resolveXToken();
  if (!token) return "";
  try {
    const res = await fetch(
      `https://api.x.com/2/users/by/username/${username}?user.fields=profile_image_url`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return "";
    const body = (await res.json()) as {
      data?: { profile_image_url?: string };
    };
    cachedAvatar =
      body.data?.profile_image_url?.replace("_normal", "_400x400") || "";
    return cachedAvatar;
  } catch {
    return "";
  }
}

function getDataMtime(): number {
  try {
    return statSync(dataPath).mtimeMs;
  } catch {
    return 0;
  }
}

// ── MIME helper ─────────────────────────────────────────────────────
const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

// ── Hono app ────────────────────────────────────────────────────────
const app = new Hono();
let lastHeartbeat = Date.now();

// Auto-exit when browser tab closes (no heartbeat for 30s)
setInterval(() => {
  if (Date.now() - lastHeartbeat > 30_000) {
    console.log("No heartbeat for 30s, exiting.");
    process.exit(0);
  }
}, 5_000);

// GET / — serve editor HTML
app.get("/", (c) => {
  return c.html(editorHTML());
});

// GET /data — return current post JSON
app.get("/data", async (c) => {
  const data = readPostData();
  const avatar = data.avatar || (await fetchAvatar(data.username));
  return c.json({ ...data, avatar, mtime: getDataMtime() });
});

// GET /image — serve attached image from disk
app.get("/image", (c) => {
  const data = readPostData();
  if (!data.image) {
    return c.text("No image attached", 404);
  }
  const imgPath = resolve(data.image);
  if (!existsSync(imgPath)) {
    return c.text("Image file not found", 404);
  }
  const ext = extname(imgPath).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  const bytes = readFileSync(imgPath);
  return new Response(bytes, {
    headers: { "Content-Type": mime, "Cache-Control": "no-cache" },
  });
});

// GET /heartbeat — reset exit timer
app.get("/heartbeat", (c) => {
  lastHeartbeat = Date.now();
  return c.json({ ok: true });
});

// POST /generate-image — generate image via gemskills
app.post("/generate-image", async (c) => {
  const body = (await c.req.json()) as { prompt: string; aspect?: string };
  if (!body.prompt) return c.json({ error: "Prompt required" }, 400);

  // Find the generate-image script
  const home = process.env.HOME || "";
  const gemskillsCache = resolve(
    home,
    ".claude/plugins/cache/b-open-io/gemskills"
  );
  let scriptDir = "";
  try {
    const versions = readdirSync(gemskillsCache)
      .filter((v: string) => /^\d+\./.test(v))
      .sort();
    if (versions.length)
      scriptDir = resolve(
        gemskillsCache,
        versions[versions.length - 1],
        "skills/generate-image"
      );
  } catch {}

  if (!scriptDir || !existsSync(resolve(scriptDir, "scripts/generate.ts"))) {
    return c.json(
      {
        error:
          "gemskills generate-image not found. Install: claude plugin install gemskills@b-open-io",
      },
      500
    );
  }

  const outputPath = resolve(dirname(dataPath), `generated-${Date.now()}.png`);
  const spawnArgs = [
    "run",
    resolve(scriptDir, "scripts/generate.ts"),
    body.prompt,
    "--output",
    outputPath,
  ];
  if (body.aspect) spawnArgs.push("--aspect", body.aspect);

  try {
    const proc = Bun.spawn(["bun", ...spawnArgs], {
      cwd: scriptDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      return c.json(
        { error: stderr.trim() || `Generate failed (exit ${exitCode})` },
        500
      );
    }
    // Update the data file's image path
    const raw = readFileSync(dataPath, "utf-8");
    const data = JSON.parse(raw);
    data.image = outputPath;
    writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return c.json({ ok: true, path: outputPath });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// POST /events — append action to .events NDJSON file
app.post("/events", async (c) => {
  const body = await c.req.json();
  const event = {
    ...body,
    timestamp: new Date().toISOString(),
  };
  appendFileSync(eventsPath, JSON.stringify(event) + "\n");
  return c.json({ ok: true });
});

// ── CSS Theme ───────────────────────────────────────────────────────
function themeCSS(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap');

:root {
  --background: oklch(0.145 0.02 250);
  --foreground: oklch(0.92 0.01 250);
  --card: oklch(0.205 0.025 250);
  --card-foreground: oklch(0.92 0.01 250);
  --popover: oklch(0.205 0.025 250);
  --popover-foreground: oklch(0.92 0.01 250);
  --primary: oklch(0.75 0.14 195);
  --primary-foreground: oklch(0.145 0.02 250);
  --secondary: oklch(0.26 0.025 250);
  --secondary-foreground: oklch(0.92 0.01 250);
  --muted: oklch(0.26 0.025 250);
  --muted-foreground: oklch(0.65 0.02 250);
  --accent: oklch(0.26 0.025 250);
  --accent-foreground: oklch(0.92 0.01 250);
  --destructive: oklch(0.55 0.2 25);
  --border: oklch(0.3 0.02 250);
  --input: oklch(0.3 0.02 250);
  --ring: oklch(0.75 0.14 195);
  --radius: 0.75rem;
  --font-sans: 'Open Sans', ui-sans-serif, system-ui, sans-serif;
}

* { box-sizing: border-box; margin: 0 }
body {
  font-family: var(--font-sans);
  background: var(--background);
  color: var(--foreground);
  min-height: 100vh;
  padding: 0;
}

/* Header bar */
.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 24px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}
.header h1 { font-size: 16px; font-weight: 700; color: var(--foreground) }
.status { font-size: 12px; color: var(--primary); display: flex; align-items: center; gap: 6px }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); animation: pulse 2s infinite }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; max-width: 1400px; margin: 0 auto; padding: 24px }
@media(max-width:900px) { .layout { grid-template-columns: 1fr } }

/* Editor column */
.editor-col { min-width: 0 }
.part {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 8px;
  transition: border-color .15s;
}
.part:focus-within { border-color: var(--primary) }
.part.drag-over { border-color: var(--primary); background: var(--background) }
.part-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px }
.part-num { color: var(--primary); font-size: 13px; font-weight: 700 }
.remove-btn {
  background: none;
  border: 1px solid oklch(0.4 0.15 25);
  color: var(--destructive);
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  cursor: pointer;
  transition: all .15s;
}
.remove-btn:hover { background: oklch(0.4 0.15 25); color: #fff }

textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--foreground);
  font-size: 17px;
  line-height: 1.4;
  resize: none;
  outline: none;
  font-family: inherit;
  min-height: 60px;
}
textarea::placeholder { color: var(--muted-foreground) }

.char-row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px }
.char-count { font-size: 12px; color: var(--muted-foreground) }
.char-count.warn { color: oklch(0.7 0.15 80) }
.char-count.over { color: var(--destructive); font-weight: 600 }

/* Image generation panel */
.img-gen { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px }
.img-gen-toggle { background: none; border: none; color: var(--primary); font-size: 13px; cursor: pointer; padding: 0; display: flex; align-items: center; gap: 6px }
.img-gen-toggle:hover { text-decoration: underline }
.img-gen-panel { display: none; margin-top: 10px }
.img-gen-panel.open { display: block }
.img-attach-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px }
.upload-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--primary); color: var(--primary-foreground);
  padding: 6px 12px; border-radius: 9999px;
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.upload-btn input { display: none }
.img-hint { font-size: 12px; color: var(--muted-foreground) }
.img-status { margin-top: 8px; font-size: 12px; color: var(--muted-foreground); min-height: 16px }
.img-status.error { color: var(--destructive) }
.img-prompt-row { display: flex; gap: 8px; margin-bottom: 8px }
.img-prompt-row textarea {
  flex: 1;
  background: var(--background);
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  min-height: 40px;
  color: var(--foreground);
}
.img-prompt-row textarea:focus { border-color: var(--primary) }
.img-controls { display: flex; gap: 8px; align-items: center }
.aspect-select, .quality-select {
  background: var(--background);
  border: 1px solid var(--border);
  color: var(--foreground);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}
.gen-btn {
  background: var(--primary); color: var(--primary-foreground);
  border: none; padding: 6px 16px; border-radius: 9999px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: opacity .15s;
}
.gen-btn:disabled { opacity: .4; cursor: wait }
.gen-spinner { display: none; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--muted-foreground) }
.gen-spinner.active { display: flex }
.img-preview-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin-top: 8px }
.img-preview-item {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--background);
}
.img-preview-item img { width: 100%; display: block; height: 120px; object-fit: cover }
.img-remove {
  position: absolute; top: 6px; right: 6px;
  background: rgba(0,0,0,.75); color: #fff;
  border: none; border-radius: 9999px;
  min-width: 22px; height: 22px; padding: 0 6px;
  cursor: pointer; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.connector { width: 2px; height: 8px; background: var(--border); margin-left: 24px }

/* Actions */
.actions { display: flex; gap: 12px; margin-top: 20px; align-items: center; flex-wrap: wrap }
.post-btn {
  padding: 10px 28px;
  background: var(--primary); color: var(--primary-foreground);
  border: none; border-radius: 9999px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  transition: background .15s;
}
.post-btn:hover { filter: brightness(1.1) }
.post-btn:disabled { opacity: .4; cursor: not-allowed }
.add-btn {
  background: none; border: 1px solid var(--border);
  color: var(--muted-foreground); padding: 8px 16px;
  border-radius: 9999px; font-size: 13px; cursor: pointer;
  transition: all .15s;
}
.add-btn:hover { border-color: var(--muted-foreground); color: var(--foreground) }
.copy-btn {
  background: none; border: 1px solid var(--border);
  color: var(--muted-foreground); padding: 8px 16px;
  border-radius: 9999px; font-size: 13px; cursor: pointer;
  transition: all .15s; display: flex; align-items: center; gap: 6px;
}
.copy-btn:hover { border-color: var(--muted-foreground); color: var(--foreground) }
.regen-btn {
  background: none; border: 1px solid var(--border);
  color: var(--muted-foreground); padding: 8px 16px;
  border-radius: 9999px; font-size: 13px; cursor: pointer;
  transition: all .15s; display: flex; align-items: center; gap: 6px;
}
.regen-btn:hover { border-color: var(--primary); color: var(--primary) }
.regen-btn svg { width: 16px; height: 16px }

/* Preview column */
.preview-col { min-width: 0; position: sticky; top: 20px; align-self: start }
.preview-label {
  font-size: 13px; color: var(--muted-foreground);
  margin-bottom: 12px; text-transform: uppercase; letter-spacing: .5px;
}
.preview-tweet {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 8px;
}
.tweet-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px }
.avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; object-fit: cover }
div.avatar {
  background: var(--primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: var(--primary-foreground);
}
.tweet-meta .display-name { font-weight: 700; font-size: 15px; color: var(--foreground) }
.tweet-meta .handle { color: var(--muted-foreground); font-size: 14px }
.tweet-text {
  font-size: 15px; line-height: 1.4;
  white-space: pre-wrap; word-break: break-word;
  color: var(--foreground); min-height: 20px;
}
.tweet-media-grid {
  margin-top: 10px; display: grid; gap: 2px;
  border-radius: var(--radius); overflow: hidden;
  border: 1px solid var(--border); background: var(--background);
}
.tweet-media-grid img { width: 100%; display: block; height: 100%; object-fit: cover; min-height: 120px; max-height: 280px }
.tweet-media-grid.media-1 { grid-template-columns: 1fr }
.tweet-media-grid.media-2 { grid-template-columns: 1fr 1fr }
.tweet-media-grid.media-3 { grid-template-columns: 1fr 1fr }
.tweet-media-grid.media-3 img:first-child { grid-column: 1/span 2; max-height: 180px }
.tweet-media-grid.media-4 { grid-template-columns: 1fr 1fr }
.tweet-engagement {
  display: flex; justify-content: space-between;
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid var(--border); max-width: 300px;
}
.tweet-engagement button {
  background: none; border: none; color: var(--muted-foreground);
  cursor: default; display: flex; align-items: center; gap: 4px;
  font-size: 13px; padding: 4px;
}
.tweet-engagement svg { width: 18px; height: 18px }
.preview-connector { width: 2px; height: 8px; background: var(--border); margin-left: 35px }

/* Disk image in preview */
.disk-image { margin-top: 10px; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border) }
.disk-image img { width: 100%; display: block; max-height: 300px; object-fit: cover }

/* Spinner */
.spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .6s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }
`;
}

// ── HTML template ───────────────────────────────────────────────────
function editorHTML(): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Post Preview</title>
<style>${themeCSS()}</style>
</head><body>

<div class="header">
  <h1>Post Preview</h1>
  <div class="status"><span class="status-dot"></span> Connected</div>
</div>

<div class="layout">
<div class="editor-col">
<div id="parts"></div>
<div class="actions">
  <button type="button" class="post-btn" id="approveBtn">Approve</button>
  <button type="button" class="add-btn" id="addBtn">+ Add Part</button>
  <button type="button" class="copy-btn" id="copyBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Text</button>
  <button type="button" class="regen-btn" id="regenBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> New Idea</button>
</div>
</div>

<div class="preview-col">
<div class="preview-label">Preview</div>
<div id="preview"></div>
</div>
</div>

<script>
let PARTS=[];
let PROFILE={name:'',username:'wildsatchmo',avatar:'',avatarUrl:''};
let HAS_DISK_IMAGE=false;
let DISK_IMAGE_URL='/image';
let lastMtime=0;
const MAX_IMAGES_PER_PART=4;
const MAX_IMAGE_BYTES=5*1024*1024;
const ACCEPTED_IMAGE_MIME=new Set(['image/jpeg','image/jpg','image/png','image/webp','image/gif']);

const partsEl=document.getElementById('parts');
const previewEl=document.getElementById('preview');
const approveBtn=document.getElementById('approveBtn');
const addBtn=document.getElementById('addBtn');
const copyBtn=document.getElementById('copyBtn');
const regenBtn=document.getElementById('regenBtn');

// ── Heartbeat ───────────────────────────────────────────────────────
setInterval(()=>fetch('/heartbeat').catch(()=>{}),10000);
window.addEventListener('beforeunload',()=>{
  try{navigator.sendBeacon('/heartbeat')}catch{}
});

// ── Data polling (check for agent-side file changes) ────────────────
setInterval(async()=>{
  try{
    const r=await fetch('/data');
    const d=await r.json();
    if(d.mtime&&d.mtime!==lastMtime){
      lastMtime=d.mtime;
      loadData(d);
    }
  }catch{}
},2000);

// ── Init ────────────────────────────────────────────────────────────
async function init(){
  try{
    const r=await fetch('/data');
    const d=await r.json();
    lastMtime=d.mtime||0;
    loadData(d);
  }catch(e){
    console.error('Failed to load data:',e);
  }
}

function loadData(d){
  PARTS=d.parts||[];
  PROFILE={name:d.username||'wildsatchmo',username:d.username||'wildsatchmo',avatar:'',avatarUrl:d.avatar||''};
  HAS_DISK_IMAGE=!!d.image;
  partsEl.innerHTML='';
  PARTS.forEach((data,i)=>{partsEl.appendChild(makePart(data,i))});
  updateAll();
  updatePreview();
}

// ── Part builder ────────────────────────────────────────────────────
function makePart(data,idx){
  const div=document.createElement('div');
  div.className='part';
  div.dataset.imageDataJson='[]';
  div.innerHTML=
    '<div class="part-head">'+
      '<span class="part-num">PART '+(idx+1)+'</span>'+
      '<button type="button" class="remove-btn" style="display:none">Remove</button>'+
    '</div>'+
    '<textarea maxlength="300" rows="3" placeholder="What\\u2019s happening?">'+escH(data.text)+'</textarea>'+
    '<div class="char-row"><span class="char-count">'+data.text.length+'/280</span></div>'+
    '<div class="img-gen">'+
      '<div class="img-attach-row">'+
        '<button type="button" class="img-gen-toggle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg> Generate Image</button>'+
        '<label class="upload-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload<input type="file" class="img-file-input" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" multiple></label>'+
      '</div>'+
      '<div class="img-hint" style="margin-top:6px;font-size:12px;color:var(--muted-foreground)">Paste or drag images into text area, or upload up to 4.</div>'+
      '<div class="img-status" aria-live="polite"></div>'+
      '<div class="img-gen-panel">'+
        '<div class="img-prompt-row"><textarea class="img-prompt" rows="3" placeholder="Image prompt...">'+escH(data.image_prompt||'')+'</textarea></div>'+
        '<div class="img-controls">'+
          '<select class="aspect-select"><option value="1:1">1:1</option><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="4:3">4:3</option><option value="3:4">3:4</option><option value="3:2">3:2</option><option value="2:3">2:3</option><option value="5:4">5:4</option><option value="4:5">4:5</option><option value="21:9">21:9</option></select>'+
          '<select class="quality-select"><option value="standard">Standard</option><option value="fast">Fast</option><option value="ultra">Ultra</option></select>'+
          '<button type="button" class="gen-btn">Generate</button>'+
        '</div>'+
      '</div>'+
      '<div class="img-preview-list"></div>'+
    '</div>';

  const ta=div.querySelector('textarea:not(.img-prompt)');
  const charCount=div.querySelector('.char-count');
  const fileInput=div.querySelector('.img-file-input');
  const imgStatus=div.querySelector('.img-status');
  const toggleBtn=div.querySelector('.img-gen-toggle');
  const panel=div.querySelector('.img-gen-panel');
  const imgPreviewList=div.querySelector('.img-preview-list');
  const removeBtn=div.querySelector('.remove-btn');

  function getImages(){
    try{
      const parsed=JSON.parse(div.dataset.imageDataJson||'[]');
      if(!Array.isArray(parsed))return[];
      return parsed.filter(v=>typeof v==='string'&&v.startsWith('data:image/')).slice(0,MAX_IMAGES_PER_PART);
    }catch{return[]}
  }

  function showImageStatus(message,isError){
    imgStatus.textContent=message||'';
    imgStatus.classList.toggle('error',!!isError);
  }

  function renderImagePreviews(){
    const images=getImages();
    imgPreviewList.innerHTML='';
    // Show disk image first if this is part 0
    if(idx===0&&HAS_DISK_IMAGE){
      const diskItem=document.createElement('div');
      diskItem.className='img-preview-item';
      diskItem.innerHTML='<img src="/image?t='+Date.now()+'" alt="Attached image"><button type="button" class="img-remove disk-img-remove">X</button>';
      imgPreviewList.appendChild(diskItem);
      diskItem.querySelector('.disk-img-remove').addEventListener('click',()=>{
        diskItem.remove();
        HAS_DISK_IMAGE=false;
        schedulePreview();
      });
    }
    images.forEach((image,imgIdx)=>{
      const item=document.createElement('div');
      item.className='img-preview-item';
      item.innerHTML='<img src="'+escH(image)+'" alt="Attachment '+(imgIdx+1)+'"><button type="button" class="img-remove" data-idx="'+imgIdx+'">X</button>';
      imgPreviewList.appendChild(item);
    });
    imgPreviewList.querySelectorAll('.img-remove:not(.disk-img-remove)').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const removeIdx=Number(btn.getAttribute('data-idx'));
        const next=getImages().filter((_,i)=>i!==removeIdx);
        setImages(next);
        showImageStatus(next.length?next.length+' image'+(next.length===1?'':'s')+' attached.':'');
      });
    });
  }

  function setImages(images){
    const clean=[...new Set(images.filter(v=>typeof v==='string'&&v.startsWith('data:image/')))].slice(0,MAX_IMAGES_PER_PART);
    div.dataset.imageDataJson=JSON.stringify(clean);
    renderImagePreviews();
    schedulePreview();
    updateAll();
  }

  function addImageDataUrls(dataUrls,source){
    const current=getImages();
    const room=MAX_IMAGES_PER_PART-current.length;
    if(room<=0){
      showImageStatus('Maximum of '+MAX_IMAGES_PER_PART+' images per part.',true);
      return;
    }
    const incoming=dataUrls.filter(v=>typeof v==='string'&&v.startsWith('data:image/')).slice(0,room);
    if(!incoming.length){
      showImageStatus('No valid images found from '+source+'.',true);
      return;
    }
    setImages([...current,...incoming]);
    const total=current.length+incoming.length;
    showImageStatus(total+' image'+(total===1?'':'s')+' attached.');
  }

  async function filesToDataUrls(files){
    const toDataUrl=(file)=>new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:'');
      reader.onerror=()=>reject(reader.error||new Error('Failed reading file'));
      reader.readAsDataURL(file);
    });
    return Promise.all(files.map(toDataUrl));
  }

  async function addImageFiles(files,source){
    const imageFiles=files.filter(file=>file&&ACCEPTED_IMAGE_MIME.has((file.type||'').toLowerCase()));
    if(!imageFiles.length){
      showImageStatus('Supported formats: JPG, PNG, WEBP, GIF.',true);
      return;
    }
    const oversized=imageFiles.find(file=>file.size>MAX_IMAGE_BYTES);
    if(oversized){
      showImageStatus('Each image must be 5MB or smaller.',true);
      return;
    }
    try{
      const dataUrls=await filesToDataUrls(imageFiles);
      addImageDataUrls(dataUrls,source);
    }catch{
      showImageStatus('Could not read image file(s).',true);
    }
  }

  function getDraggedImageFiles(dataTransfer){
    if(!dataTransfer)return[];
    if(dataTransfer.items&&dataTransfer.items.length){
      return[...dataTransfer.items]
        .filter(item=>item.kind==='file')
        .map(item=>item.getAsFile())
        .filter(file=>file&&file.type&&file.type.startsWith('image/'));
    }
    return[...(dataTransfer.files||[])].filter(file=>file&&file.type&&file.type.startsWith('image/'));
  }

  // Text input
  ta.addEventListener('input',()=>{
    autoResize(ta);
    updateCharCount(ta,charCount);
    updateAll();
    schedulePreview();
  });

  // Paste images
  ta.addEventListener('paste',async(e)=>{
    const items=[...(e.clipboardData?.items||[])];
    const files=items.filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
    if(!files.length)return;
    const hasText=Boolean(e.clipboardData?.getData('text/plain')||e.clipboardData?.getData('text/html'));
    if(!hasText)e.preventDefault();
    await addImageFiles(files,'clipboard');
  });

  // Drag and drop images
  let dragDepth=0;
  div.addEventListener('dragenter',(e)=>{
    const files=getDraggedImageFiles(e.dataTransfer);
    if(!files.length)return;
    e.preventDefault();
    dragDepth+=1;
    div.classList.add('drag-over');
  });
  div.addEventListener('dragover',(e)=>{
    const files=getDraggedImageFiles(e.dataTransfer);
    if(!files.length)return;
    e.preventDefault();
    if(e.dataTransfer)e.dataTransfer.dropEffect='copy';
    div.classList.add('drag-over');
  });
  div.addEventListener('dragleave',(e)=>{
    const files=getDraggedImageFiles(e.dataTransfer);
    if(!files.length)return;
    e.preventDefault();
    dragDepth=Math.max(0,dragDepth-1);
    if(dragDepth===0)div.classList.remove('drag-over');
  });
  div.addEventListener('drop',async(e)=>{
    const files=getDraggedImageFiles(e.dataTransfer);
    if(!files.length)return;
    e.preventDefault();
    dragDepth=0;
    div.classList.remove('drag-over');
    await addImageFiles(files,'drag and drop');
  });

  autoResize(ta);

  // File upload
  fileInput.addEventListener('change',async()=>{
    const files=[...(fileInput.files||[])];
    if(files.length)await addImageFiles(files,'upload');
    fileInput.value='';
  });

  // Toggle image prompt panel
  toggleBtn.addEventListener('click',()=>{
    panel.classList.toggle('open');
  });

  // Generate image
  const genBtn=div.querySelector('.gen-btn');
  const promptTa=div.querySelector('.img-prompt');
  const aspectSelect=div.querySelector('.aspect-select');
  genBtn.addEventListener('click',async()=>{
    const prompt=promptTa.value.trim();
    if(!prompt){showImageStatus('Enter an image prompt first.',true);return}
    genBtn.disabled=true;
    showImageStatus('Generating image...');
    try{
      const r=await fetch('/generate-image',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt,aspect:aspectSelect.value})
      });
      const d=await r.json();
      if(d.error){showImageStatus('Error: '+d.error,true);return}
      HAS_DISK_IMAGE=true;
      renderImagePreviews();
      showImageStatus('Image generated.');
      schedulePreview();
    }catch(e){
      showImageStatus('Generation failed: '+e,true);
    }finally{
      genBtn.disabled=false;
    }
  });

  // Remove part
  removeBtn.addEventListener('click',()=>{
    div.remove();
    updateAll();
    schedulePreview();
  });

  setImages([]);
  return div;
}

// ── Utilities ───────────────────────────────────────────────────────
function autoResize(ta){ta.style.height='auto';ta.style.height=Math.max(60,ta.scrollHeight)+'px'}
function updateCharCount(ta,el){
  const len=ta.value.length;
  el.textContent=len+'/280';
  el.className='char-count'+(len>260?' warn':'')+(len>280?' over':'');
}

function updateAll(){
  const parts=partsEl.querySelectorAll('.part');
  parts.forEach((p,i)=>{
    p.querySelector('.part-num').textContent='PART '+(i+1);
    p.querySelector('.remove-btn').style.display=parts.length>1?'':'none';
  });
  // Manage connectors
  partsEl.querySelectorAll('.connector').forEach(c=>c.remove());
  parts.forEach((p,i)=>{
    if(i<parts.length-1){const c=document.createElement('div');c.className='connector';p.after(c)}
  });
  const anyOver=[...parts].some(p=>p.querySelector('textarea:not(.img-prompt)').value.length>280);
  const allEmpty=[...parts].every(p=>p.querySelector('textarea:not(.img-prompt)').value.trim()==='');
  approveBtn.disabled=anyOver||allEmpty;
  approveBtn.textContent=parts.length>1?'Approve Thread ('+parts.length+')':'Approve';
}

let previewTimer;
function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,150)}

function getPartImages(partDiv){
  try{
    const parsed=JSON.parse(partDiv.dataset.imageDataJson||'[]');
    if(!Array.isArray(parsed))return[];
    return parsed.filter(v=>typeof v==='string'&&v.startsWith('data:image/')).slice(0,MAX_IMAGES_PER_PART);
  }catch{return[]}
}

function updatePreview(){
  const parts=[...partsEl.querySelectorAll('.part')];
  let html='';
  parts.forEach((p,i)=>{
    const text=p.querySelector('textarea:not(.img-prompt)').value;
    const images=getPartImages(p);

    if(i>0)html+='<div class="preview-connector"></div>';
    html+='<div class="preview-tweet">';
    html+='<div class="tweet-header">';
    html+=PROFILE.avatarUrl
      ?'<img class="avatar" src="'+escH(PROFILE.avatarUrl)+'" alt="">'
      :'<div class="avatar">'+escH(PROFILE.name.charAt(0).toUpperCase())+'</div>';
    html+='<div class="tweet-meta"><div class="display-name">'+escH(PROFILE.name)+'</div><div class="handle">@'+escH(PROFILE.username)+' \\u00b7 now</div></div>';
    html+='</div>';
    html+='<div class="tweet-text">'+formatTweetText(text)+'</div>';
    if(images.length){
      html+=renderPreviewMedia(images);
    }else if(i===0&&HAS_DISK_IMAGE){
      html+='<div class="disk-image"><img src="/image?t='+Date.now()+'" alt="Attached image"></div>';
    }
    html+='<div class="tweet-engagement">';
    html+='<button><svg viewBox="0 0 24 24"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.306-2.376 5.806l-6.124 6.377a1 1 0 0 1-1.444-.003l-6.1-6.382C2.64 14.29 1.751 12.24 1.751 10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>';
    html+='<button><svg viewBox="0 0 24 24"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" fill="currentColor"/></svg></button>';
    html+='<button><svg viewBox="0 0 24 24"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>';
    html+='<button><svg viewBox="0 0 24 24"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>';
    html+='<button><svg viewBox="0 0 24 24"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" fill="currentColor"/></svg></button>';
    html+='</div>';
    html+='</div>';
  });
  previewEl.innerHTML=html;
}

function renderPreviewMedia(images){
  const count=Math.max(1,Math.min(images.length,MAX_IMAGES_PER_PART));
  let html='<div class="tweet-media-grid media-'+count+'">';
  images.slice(0,MAX_IMAGES_PER_PART).forEach((img,idx)=>{
    html+='<img src="'+escH(img)+'" alt="Attachment '+(idx+1)+'">';
  });
  html+='</div>';
  return html;
}

function formatTweetText(text){
  return escH(text)
    .replace(/(https?:\\/\\/[^\\s]+)/g,'<span style="color:var(--primary)">$1</span>')
    .replace(/@(\\w+)/g,'<span style="color:var(--primary)">@$1</span>')
    .replace(/#(\\w+)/g,'<span style="color:var(--primary)">#$1</span>');
}

function escH(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ── Collect current parts data ──────────────────────────────────────
function collectParts(){
  return[...partsEl.querySelectorAll('.part')].map(p=>{
    const text=p.querySelector('textarea:not(.img-prompt)').value;
    const promptTa=p.querySelector('.img-prompt');
    const imagePrompt=promptTa?promptTa.value:'';
    const images=getPartImages(p);
    return{text,image_prompt:imagePrompt||undefined,images:images.length?images:undefined};
  });
}

// ── Actions ─────────────────────────────────────────────────────────
approveBtn.addEventListener('click',async()=>{
  const parts=collectParts();
  approveBtn.disabled=true;
  approveBtn.textContent='Approving...';
  try{
    await fetch('/events',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'approve',parts})
    });
    approveBtn.textContent='Approved!';
    approveBtn.style.background='oklch(0.55 0.15 145)';
  }catch(e){
    approveBtn.disabled=false;
    approveBtn.textContent='Approve';
    console.error('Approve failed:',e);
  }
});

copyBtn.addEventListener('click',async()=>{
  const parts=collectParts();
  const text=parts.map(p=>p.text).join('\\n\\n---\\n\\n');
  try{
    await navigator.clipboard.writeText(text);
    copyBtn.querySelector('svg').nextSibling.textContent=' Copied!';
    setTimeout(()=>{copyBtn.querySelector('svg').nextSibling.textContent=' Copy Text'},1500);
  }catch{}
  fetch('/events',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'copy',parts})
  }).catch(()=>{});
});

regenBtn.addEventListener('click',async()=>{
  regenBtn.disabled=true;
  regenBtn.style.opacity='.5';
  try{
    await fetch('/events',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'regenerate'})
    });
  }catch(e){
    console.error('Regenerate event failed:',e);
  }
  setTimeout(()=>{regenBtn.disabled=false;regenBtn.style.opacity=''},2000);
});

addBtn.addEventListener('click',()=>{
  const idx=partsEl.querySelectorAll('.part').length;
  partsEl.appendChild(makePart({text:'',image_prompt:''},idx));
  updateAll();
  schedulePreview();
  partsEl.querySelector('.part:last-child textarea:not(.img-prompt)').focus();
});

// ── Start ───────────────────────────────────────────────────────────
init();
</script>
</body></html>`;
}

// ── Start server ────────────────────────────────────────────────────
const url = `http://localhost:${port}`;
console.log(`Playground server running at ${url}`);
console.log(`Data file: ${dataPath}`);
console.log(`Events file: ${eventsPath}`);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

if (autoOpen) {
  Bun.spawn(["open", url]);
}
