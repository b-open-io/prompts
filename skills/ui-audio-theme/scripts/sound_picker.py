#!/usr/bin/env python3
"""
Interactive sound picker for UI audio themes.

Serves a local audition page: every sound slot gets a play button, an editable
generation prompt (pre-filled from the vibe), a "Generate next" button that
produces a fresh candidate via ElevenLabs, and per-candidate "Accept" buttons
that write the winner into the theme directory.

Runs entirely on localhost — no CSP limits, works the same whether the agent
runtime is Claude Code or Codex.

Usage:
    python sound_picker.py --vibe pixel-minimal --output-dir ./audio-theme
    python sound_picker.py --vibe-custom "soft wooden tones" --output-dir ./audio-theme --port 7777
"""

import argparse
import json
import shutil
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from generate_theme import (
    SOUND_CATEGORIES,
    VIBE_PRESETS,
    build_prompt,
    generate_sound,
    get_api_key,
    require_ffmpeg,
)

PAGE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>UI Sound Picker</title>
<style>
  :root { --bg:#2b120a; --fg:#f2e6d9; --accent:#e38f1a; --blue:#8cb4cb; --line:#5a3a28; }
  * { box-sizing:border-box; }
  body { background:var(--bg); color:var(--fg); font-family:ui-monospace,Menlo,monospace;
         margin:0; padding:2rem; font-size:13px; }
  h1 { color:var(--accent); font-size:1.1rem; letter-spacing:.08em; }
  h2 { color:var(--blue); font-size:.85rem; margin:2rem 0 .5rem; text-transform:uppercase; }
  .slot { border:1px solid var(--line); padding:.9rem; margin-bottom:.75rem; }
  .slot-head { display:flex; align-items:center; gap:.8rem; flex-wrap:wrap; }
  .slot-name { color:var(--fg); min-width:220px; font-weight:bold; }
  button { background:none; border:1px solid var(--blue); color:var(--blue);
           font:inherit; padding:.3rem .7rem; cursor:pointer; }
  button:hover { border-color:var(--accent); color:var(--accent); }
  button:disabled { opacity:.4; cursor:wait; }
  button.accept { border-color:var(--accent); color:var(--accent); }
  button.accepted { background:var(--accent); color:var(--bg); }
  textarea { width:100%; margin-top:.6rem; background:#1d0c06; color:var(--fg);
             border:1px solid var(--line); font:inherit; padding:.5rem; min-height:3.2em; }
  .cands { display:flex; gap:.5rem; margin-top:.6rem; flex-wrap:wrap; }
  .cand { display:flex; gap:.25rem; align-items:center; border:1px dashed var(--line); padding:.25rem .4rem; }
  .hint { color:var(--blue); opacity:.7; }
</style>
</head>
<body>
<h1>[ ♪ UI SOUND PICKER ]</h1>
<div class="hint">Vibe: <span id="vibe"></span> · playback volume matches app (30%) ·
"Generate next" calls ElevenLabs live · "Accept" writes into the theme directory.</div>
<div id="slots"></div>
<script>
const VOL = 0.3;
function play(url, scale=1) {
  const a = new Audio(url + "?t=" + Date.now());
  a.volume = VOL * scale;
  a.play();
}
async function state() { return (await fetch("/api/state")).json(); }
async function render() {
  const s = await state();
  document.getElementById("vibe").textContent = s.vibe;
  const root = document.getElementById("slots");
  root.innerHTML = "";
  let lastCat = "";
  for (const slot of s.slots) {
    if (slot.category !== lastCat) {
      lastCat = slot.category;
      const h = document.createElement("h2");
      h.textContent = slot.category;
      root.appendChild(h);
    }
    const div = document.createElement("div");
    div.className = "slot";
    div.innerHTML = `
      <div class="slot-head">
        <span class="slot-name">${slot.name}</span>
        ${slot.current ? `<button onclick="play('${slot.current}')">▶ current</button>` : `<span class="hint">no current file</span>`}
        <button id="gen-${slot.name}" onclick="gen('${slot.name}')">Generate next →</button>
      </div>
      <textarea id="prompt-${slot.name}">${slot.prompt}</textarea>
      <div class="cands" id="cands-${slot.name}"></div>`;
    root.appendChild(div);
    for (const c of slot.candidates) addCand(slot.name, c);
  }
}
function addCand(name, url) {
  const wrap = document.getElementById("cands-" + name);
  const el = document.createElement("span");
  el.className = "cand";
  el.innerHTML = `<button onclick="play('${url}')">▶</button>
    <button class="accept" onclick="accept('${name}','${url}',this)">accept</button>`;
  wrap.appendChild(el);
}
async function gen(name) {
  const btn = document.getElementById("gen-" + name);
  btn.disabled = true; btn.textContent = "generating…";
  try {
    const prompt = document.getElementById("prompt-" + name).value;
    const res = await fetch("/api/generate", { method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ sound:name, prompt }) });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    addCand(name, data.url);
    play(data.url);
  } finally { btn.disabled = false; btn.textContent = "Generate next →"; }
}
async function accept(name, url, el) {
  const res = await fetch("/api/accept", { method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ sound:name, url }) });
  const data = await res.json();
  if (data.error) { alert(data.error); return; }
  el.textContent = "accepted ✓"; el.className = "accept accepted";
}
render();
</script>
</body>
</html>
"""


class PickerState:
    def __init__(self, vibe: str, output_dir: Path, categories):
        self.vibe = vibe
        self.output_dir = output_dir
        self.categories = categories or list(SOUND_CATEGORIES.keys())
        self.api_key = get_api_key()
        self.candidate_dir = output_dir / ".picker"
        self.candidate_dir.mkdir(parents=True, exist_ok=True)
        self.prompts = {}
        self.counter = 0

    def slot_info(self, category: str, name: str, config: dict) -> dict:
        current = self.output_dir / category / f"{name}.mp3"
        cands = sorted((self.candidate_dir / name).glob("*.mp3")) if (self.candidate_dir / name).exists() else []
        return {
            "name": name,
            "category": category,
            "prompt": self.prompts.get(name) or build_prompt(self.vibe, config["modifier"]),
            "current": f"/files/{category}/{name}.mp3" if current.exists() else None,
            "candidates": [f"/files/.picker/{name}/{c.name}" for c in cands],
        }

    def slots(self):
        out = []
        for category, sounds in SOUND_CATEGORIES.items():
            if category not in self.categories:
                continue
            for name, config in sounds.items():
                out.append(self.slot_info(category, name, config))
        return out

    def sound_config(self, sound: str):
        for category, sounds in SOUND_CATEGORIES.items():
            if sound in sounds:
                return category, sounds[sound]
        return None, None

    def generate_candidate(self, sound: str, prompt: str) -> dict:
        category, config = self.sound_config(sound)
        if config is None:
            return {"error": f"Unknown sound: {sound}"}
        self.prompts[sound] = prompt
        self.counter += 1
        out = self.candidate_dir / sound / f"cand-{int(time.time())}-{self.counter}.mp3"
        result = generate_sound(
            api_key=self.api_key,
            prompt=prompt,
            duration_seconds=config["duration"],
            output_path=out,
            normalize=True,
        )
        if not result.success:
            return {"error": result.error or "generation failed"}
        return {"url": f"/files/.picker/{sound}/{out.name}"}

    def accept(self, sound: str, url: str) -> dict:
        category, config = self.sound_config(sound)
        if config is None:
            return {"error": f"Unknown sound: {sound}"}
        rel = url.removeprefix("/files/")
        src = (self.output_dir / rel).resolve()
        if not src.is_file() or self.output_dir.resolve() not in src.parents:
            return {"error": f"Candidate not found: {url}"}
        dest = self.output_dir / category / f"{sound}.mp3"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        manifest_path = self.output_dir / "theme.json"
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text())
            entry = manifest.get("sounds", {}).get(sound)
            if entry is not None:
                entry["prompt"] = self.prompts.get(sound, entry.get("prompt"))
                entry["picked"] = True
                manifest_path.write_text(json.dumps(manifest, indent=2))
        return {"ok": True, "written": str(dest)}


def make_handler(state: PickerState):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

        def _json(self, payload, status=200):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/":
                body = PAGE.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif path == "/api/state":
                self._json({"vibe": state.vibe, "slots": state.slots()})
            elif path.startswith("/files/"):
                rel = path.removeprefix("/files/")
                file_path = (state.output_dir / rel).resolve()
                if not file_path.is_file() or state.output_dir.resolve() not in file_path.parents:
                    self._json({"error": "not found"}, 404)
                    return
                data = file_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self._json({"error": "not found"}, 404)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", "0"))
            try:
                payload = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._json({"error": "invalid JSON"}, 400)
                return
            if self.path == "/api/generate":
                self._json(state.generate_candidate(payload.get("sound", ""), payload.get("prompt", "")))
            elif self.path == "/api/accept":
                self._json(state.accept(payload.get("sound", ""), payload.get("url", "")))
            else:
                self._json({"error": "not found"}, 404)

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Interactive UI sound picker")
    parser.add_argument("--vibe", help="Preset vibe name")
    parser.add_argument("--vibe-custom", help="Custom vibe description")
    parser.add_argument("--output-dir", default="./audio-theme", help="Theme directory")
    parser.add_argument("--categories", nargs="+", help="Limit to specific categories")
    parser.add_argument("--port", type=int, default=7777)
    args = parser.parse_args()

    if args.vibe_custom:
        vibe = args.vibe_custom
    elif args.vibe:
        if args.vibe not in VIBE_PRESETS:
            print(f"Error: Unknown vibe preset '{args.vibe}'")
            print(f"Available presets: {', '.join(VIBE_PRESETS.keys())}")
            sys.exit(1)
        vibe = VIBE_PRESETS[args.vibe]
    else:
        print("Error: Must specify --vibe or --vibe-custom")
        sys.exit(1)

    require_ffmpeg()
    state = PickerState(vibe, Path(args.output_dir).resolve(), args.categories)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(state))
    print(f"Sound picker running at http://127.0.0.1:{args.port}")
    print(f"Theme directory: {state.output_dir}")
    print("Ctrl-C to stop. Accepted sounds are written into the theme directory immediately.")
    server.serve_forever()


if __name__ == "__main__":
    main()
