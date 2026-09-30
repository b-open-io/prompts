---
name: promo-video-pipeline
version: 0.0.5
description: >-
  Use this when making a motion-graphics promo or showreel, a short social cut or a
  longer commercial cut, from the user's prompt plus optional music. Covers
  gpt-image-2.5-flare inspiration keyframes, an approval gate before video spend, a
  budget-capped headless Claude Opus 5.5 edit through the Higgsfield REST API, Suno
  scoring, beat alignment, -14 LUFS loudness, and H.264 exports that play cleanly in
  QuickTime and Discord.
---

# Promo Video Pipeline

Produce a motion-graphics promo from the user's prompt. Two roles split the work:

- **The image/video owner** prepares inputs, gates spend, and finishes the audio and exports. The owner never designs the video directly.
- **The coding model** (Claude Opus 5.5, headless) designs and edits the video, generating clips through the Higgsfield REST API.

## When

- A short social cut (~15–18 s) or a longer commercial cut (~35 s), or both. Reuse clips across the two.
- A showreel or launch promo built from the user's prompt, real product captures, and brand references.
- The user supplies music, or will score the rough cut in Suno.

Not for: a single generated clip (use `gemskills:generate-video`), a single image (use `gemskills:generate-image`), a terminal recording (use `cli-demo-gif`), or spoken voice (use `voice-clone`).

## Requirements

- The `gemskills` plugin (`b-open-io/gemskills`) for keyframes. This skill does not duplicate its generation logic.
- Claude Code CLI 2.1.219 or newer (for `sandbox.network.strictAllowlist`) with access to Claude Opus 5.5.
- The Claude Code OS sandbox: Seatbelt on macOS (built in), or `bubblewrap` and `socat` on Linux. The launcher refuses to start without it.
- Higgsfield API credentials (key ID and secret).
- ffmpeg 5.1 or newer (`-fps_mode` replaced the deprecated `-vsync`), ffprobe, `curl`, `jq`, and `setsid` (util-linux; `brew install util-linux` on macOS).
- The two scripts shipped with this skill (in Claude Code, under `${CLAUDE_SKILL_DIR}/scripts/`): the `hf-api` wrapper and the spend and tamper gate `gate-logger.sh`. No other wrapper is accepted.
- The user's own Suno account if they want a scored track.

### The `hf-api` wrapper

The coding model calls Higgsfield only through `scripts/hf-api`, which ships with this skill. The launcher installs it as `~/.hf-api/bin/hf-api`. The wrapper takes its state directory from its own install path (the parent of `bin/`), never from the environment, so a caller cannot point it at a fake gate, budget, or ledger. A copy anywhere else has no key and refuses to run. `gate-logger.sh` refuses to start unless the installed file is byte-identical (same sha256) to the one shipped beside it, and it trips if the file changes during the run. So the armed-gate check and the budget are always enforced by code this skill ships, never by a wrapper that only claims to.

State lives in `~/.hf-api/`, outside the run's working directory, where the coding model's file tools cannot reach it:

| File | Contents |
|------|----------|
| `key` | `ID:SECRET` on one line, mode 600. The wrapper passes it to curl through a header file, never on the command line. |
| `budget` | The Higgsfield spend cap in USD. |
| `prices.json` | The price of each model the run may use, copied from Higgsfield's public catalog: `{"<model path>": {"usd_per_second": N}}` (charged on the body's `duration`) or `{"<model path>": {"usd_per_request": N}}`. A model without an entry is never submitted. |
| `ledger.jsonl` | One object per spend or refund, each with a numeric `cost_usd`. |
| `gate/armed` | PID of the live `gate-logger.sh` that armed the run. |
| `gate/snapshot.json` | sha256 of `hf-api`, `prices.json`, and `budget`, taken by the gate at start, with read-only copies `gate/prices.json` and `gate/budget`. On every call `hf-api` checks its own sha256 and the live price table and budget against the snapshot, refuses (exit 4) on any difference, and prices only from the gate's copies. The gate also trips if any of the three changes. |

| Command | Behavior |
|---------|----------|
| `capabilities` | Prints `{"contract": "hf-api/1", "state_dir", "gate_file", "budget_file", "ledger", "probe": true}` for its own state directory. |
| `generate --model PATH --json BODY` | Refuses (exit 4) unless `gate/armed` names a live `gate-logger.sh` process, the model has a price, and the ledger total plus the estimate stays within `budget`. Then it POSTs the body to `https://platform.higgsfield.ai/<model path>` and appends the request ID, model, parameters, and estimate to the ledger. A clean 4xx rejection is not booked. Any other outcome is booked, including a timeout, because it may have been charged. `generate --probe` runs the same checks without contacting Higgsfield or writing the ledger, and exits 0 when it would submit or 4 when it refuses. |
| `estimate --model PATH --json BODY` | Prices a request from `prices.json`. |
| `status ID` | Polls `/requests/<id>/status` and downloads finished output right away to `./hf-output/<id>/`; do not rely on Higgsfield keeping it. A `failed` or `nsfw` result refunds its estimate in the ledger, once. |
| `cancel ID` | POSTs `/requests/<id>/cancel`. Higgsfield can cancel only while the request is queued. An accepted cancel refunds the estimate, once. |
| `balance` | Reports spend and remaining budget from the ledger. The REST API has no balance endpoint, so the ledger is the only record. |

The gate sums the ledger. Auth is the header `Authorization: Key ID:SECRET`. The coding model never sees the key.

## Steps

### 1. Inspiration keyframes (approval gate)

1. Collect inputs: real product captures, brand references (logo, palette, type), and the user's idea prompts.
2. Generate ~10–12 keyframes with `gemskills:generate-image` on gpt-image-2.5-flare (`--model flare`, `--aspect 16:9` or `9:16`, captures and brand refs passed with `--input`). Go through the gemskills skill, never raw curl.
3. The keyframes propose NEW scenes and screens. Plain screenshots are not a storyboard.
4. Any real product UI in the final video must be a real capture. Never ship AI-generated interface.
5. Show the user the actual images, a contact sheet plus full-size files, and get approval before any video spend:

```bash
ffmpeg -pattern_type glob -i 'keyframes/*.png' \
  -vf "scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2,tile=4x3:padding=8:margin=8" \
  -frames:v 1 contact-sheet.jpg
```

No approval, no Step 2.

### 2. Headless Opus run

Run Claude Opus 5.5 headless on the machine that has `hf-api`.

**Prompt.** Pass the user's prompt verbatim. Only adapt length or purpose if the user asked. For a 15-second motion reel when the user supplies a subject but no fuller creative brief, use this reusable base prompt with their subject filled in:

> make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out
>
> subject: <the user's subject>

Keep the subject specific to the current request; never bake an example brand, website, protocol, or app into the skill. When the user has already supplied their own prompt, including this motion-reel direction, preserve their wording instead of replacing it with the template. Add, as separate inputs: the approved keyframe paths, reusable clips from earlier runs, the music track if supplied, and hard constraints (exact CTA text, locked narration, which shots must be real captures). Put run rules in an appended system prompt so the user's text stays untouched:

- Generate video only through `hf-api`. Stay under the budget cap.
- Render in the foreground and wait for each render to finish. Background renders die when the headless turn ends.
- Write an SFX script alongside the edit that lists every sound effect with its timecode.
- Do not hard-code counts that change over time (see Rules).

**Config.**

- Empty strict MCP config: `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`.
- `--disable-slash-commands`, which turns off all skills and commands.
- HyperFrames and any other video plugins disabled for the run (`enabledPlugins` set to `false` in the run-only settings the launcher writes).
- `--setting-sources ""`, so only the launcher's `--settings` file applies. User, project, and local settings cannot widen the allowlist or the sandbox.
- The Claude Code OS sandbox on every Bash command, with no escape hatch: `failIfUnavailable`, `allowUnsandboxedCommands: false`, `autoAllowBashIfSandboxed: false`. Sandboxed commands cannot read or write `~/.hf-api` and have no network (`allowedDomains: []`, `strictAllowlist: true`). Only `hf-api` runs outside the sandbox (`excludedCommands`), because it alone needs the key and the Higgsfield host.
- `--permission-mode dontAsk`: any tool call the allowlist does not name is denied. A prefix rule such as `Bash(hf-api *)` does not cover `hf-api … && cat …`, so a compound command cannot ride along with the unsandboxed wrapper.
- File tools scoped to the working directory, with the wrapper's state directory and `./.claude` denied, so the model cannot read the key or edit the wrapper, ledger, prices, or its own settings.
- ffmpeg and ffprobe stay on the allowlist only because they run inside the sandbox: a crafted command line cannot reach the network (`-method POST`, remote URLs) or the state directory, however it quotes paths.
- Two separate caps. `HF_BUDGET_USD` (written to `~/.hf-api/budget`) caps Higgsfield spend: `hf-api` refuses past it and the gate kills the run if the ledger goes over it. `--max-budget-usd` caps only model spend.

**Gate (hard precondition).** No spend-capable step runs until the gate is up and verified; any failed check stops the run. The gate (`scripts/gate-logger.sh`) runs detached with `setsid nohup` so it outlives the shell that started it. It writes `ready` once its preconditions hold, writes `armed` only after the run's `system`/`init` event shows `claude-opus-5-5` with 0 MCP servers and 0 skills, and `hf-api generate` refuses without `armed`. Every ledger entry goes to `gate.log`. It removes `armed`, writes the reason to `tripped`, and kills the run's process group on any of these: a tool call before the init check, a changed `hf-api` binary, a rewritten or malformed ledger, Higgsfield spend over `HF_BUDGET_USD`, or a tool call that names the key, ledger, wrapper, gate directory, or a `higgsfield.ai` host. Protected names match only as whole path tokens, so a key file named `key` stops `cat key` but not `ls keyframes/`, and they are matched again with shell quotes and backslashes removed, so `k''ey` or `higgs""field.ai` also trips. It also trips when `prices.json`, `budget`, or its own snapshot changes. The tripwire is a backstop; the OS sandbox is the boundary. The gate also stops the run whenever it exits any other way than a clean end of the run: an unexpected command failure (it runs under `set -e`) or an INT, TERM, or HUP signal. Before the gate starts, the launcher installs the shipped wrapper, checks that the installed copy has the shipped sha256, checks `hf-api capabilities` against the contract above, and requires `hf-api generate --probe` to refuse (exit 4) while no gate is armed. The gate repeats the sha256 check itself, so a wrapper swapped in after install is also refused. The launcher's own exit and signal traps kill the run and the gate.

**Key isolation.** The sandbox keeps the key away from the model's Bash commands and the deny rules keep it away from its file tools, but the key is still a file the agent's OS user can read. Full protection needs the key outside that user: run `hf-api` as a separate OS user that owns `~/.hf-api` (the model's user reaches it only through a fixed `sudo -u` rule), or keep the secret in the OS keychain. The launcher refuses to start when it can see the key is exposed: the key is not a regular file owned by you with mode 600 or 400, the state directory is not mode 700, the state directory sits inside the working directory, the working directory holds `.claude` settings, or the generated run settings lack any of the sandbox and deny rules above.

```bash
set -euo pipefail
no_run() { echo "$*; no run" >&2; exit 1; }
SKILL_BIN="${CLAUDE_SKILL_DIR:?run from the skill}/scripts"
GATE_BIN="$SKILL_BIN/gate-logger.sh"
HF_STATE="$HOME/.hf-api"                  # key, budget, prices.json, ledger
HF_GATE_DIR="$HF_STATE/gate" HF_BUDGET_USD=15
[[ -x $GATE_BIN && -f $SKILL_BIN/hf-api ]] || no_run "shipped gate-logger or hf-api missing"
for tool in setsid jq curl claude uuidgen; do command -v "$tool" >/dev/null || no_run "$tool missing"; done
if [[ $(uname) == Darwin ]]; then deps=(sandbox-exec); else deps=(bwrap socat); fi
for tool in "${deps[@]}"; do command -v "$tool" >/dev/null || no_run "$tool missing; the Claude Code sandbox cannot start"; done
ver=$(claude --version | awk '{print $1}')
awk -v v="$ver" 'BEGIN { split(v, a, "."); exit !(a[1] > 2 || (a[1] == 2 && (a[2] > 1 || (a[2] == 1 && a[3] >= 219)))) }' \
  || no_run "Claude Code $ver predates sandbox.network.strictAllowlist (2.1.219)"
sha() { if command -v sha256sum >/dev/null; then sha256sum < "$1"; else shasum -a 256 < "$1"; fi | cut -d' ' -f1; }
perm() { stat -c '%a %u' "$1" 2>/dev/null || stat -f '%Lp %u' "$1"; }
mkdir -p "$HF_STATE/bin" && chmod 700 "$HF_STATE"
install -m 0555 "$SKILL_BIN/hf-api" "$HF_STATE/bin/hf-api"
HF_BIN="$HF_STATE/bin/hf-api"
[[ $(sha "$HF_BIN") == "$(sha "$SKILL_BIN/hf-api")" ]] || no_run "installed hf-api does not match the shipped sha256"
[[ -s $HF_STATE/key && -s $HF_STATE/prices.json ]] || no_run "put ID:SECRET in $HF_STATE/key and model prices in $HF_STATE/prices.json"
jq -e 'type == "object" and length > 0' "$HF_STATE/prices.json" > /dev/null || no_run "prices.json is not a price table"

# Refuse wherever the key is visibly exposed to the model's process.
[[ -f $HF_STATE/key && ! -L $HF_STATE/key ]] || no_run "the key must be a regular file"
read -r kmode kuid <<< "$(perm "$HF_STATE/key")"
[[ $kuid == "$(id -u)" && $kmode =~ ^[46]00$ ]] || no_run "the key must be yours with mode 600 or 400 (is $kmode)"
read -r smode _ <<< "$(perm "$HF_STATE")"
[[ $smode == 700 ]] || no_run "$HF_STATE must be mode 700 (is $smode)"
st=$(cd "$HF_STATE" && pwd -P) wd=$(pwd -P)
case "$st/" in "$wd/"*) no_run "the state directory is inside the working directory" ;; esac
case "$wd/" in "$st/"*) no_run "the working directory is inside the state directory" ;; esac
[[ ! -e .claude ]] || no_run "remove ./.claude; the run takes its settings only from run-settings.json"

jq -n --arg wd "$wd" '{
  enabledPlugins: {},
  permissions: {
    defaultMode: "dontAsk",
    deny: ["Read(~/.hf-api/**)", "Edit(~/.hf-api/**)", "Read(./.claude/**)", "Edit(./.claude/**)",
           "Edit(./run.jsonl)", "Edit(./run-settings.json)", "Edit(./gate.out)",
           "Bash(curl *)", "Bash(wget *)", "WebFetch", "WebSearch"]
  },
  sandbox: {
    enabled: true, failIfUnavailable: true,
    allowUnsandboxedCommands: false, autoAllowBashIfSandboxed: false,
    excludedCommands: ["hf-api *"],
    filesystem: {
      denyRead: ["~/.hf-api"],
      denyWrite: ["~/.hf-api", "\($wd)/.claude", "\($wd)/run.jsonl", "\($wd)/run-settings.json", "\($wd)/gate.out"]
    },
    credentials: {files: [{path: "~/.hf-api/key", mode: "deny"}]},
    network: {allowedDomains: [], strictAllowlist: true}
  }
}' > run-settings.json
jq -e '.sandbox as $s | $s.enabled and $s.failIfUnavailable
  and $s.allowUnsandboxedCommands == false and $s.autoAllowBashIfSandboxed == false
  and $s.excludedCommands == ["hf-api *"] and $s.network.allowedDomains == []
  and $s.network.strictAllowlist and ($s.filesystem.denyRead | index("~/.hf-api"))
  and .permissions.defaultMode == "dontAsk"
  and (.permissions.deny | index("Read(~/.hf-api/**)"))' run-settings.json > /dev/null \
  || no_run "run-settings.json does not confine the run"
printf '%s\n' "$HF_BUDGET_USD" > "$HF_STATE/budget"
touch "$HF_STATE/ledger.jsonl"; : > run.jsonl
export PATH="$HF_STATE/bin:$PATH"         # the coding model's `hf-api` is the installed copy

# The installed wrapper must report this state dir and refuse an unarmed generate.
caps=$("$HF_BIN" capabilities) || no_run "hf-api capabilities failed"
jq -e --arg s "$(cd "$HF_STATE" && pwd -P)" '.contract == "hf-api/1" and .probe == true and .state_dir == $s
  and .gate_file == "\($s)/gate/armed" and .budget_file == "\($s)/budget"
  and .ledger == "\($s)/ledger.jsonl"' <<< "$caps" > /dev/null \
  || no_run "hf-api does not meet the contract: $caps"
rm -f "$HF_GATE_DIR/armed"
set +e; "$HF_BIN" generate --probe > /dev/null 2>&1; probe=$?; set -e
(( probe == 4 )) || no_run "hf-api generate --probe exited $probe without an armed gate (want 4)"

RUN_PID="" GATE_PID=""
cleanup() {
  [[ -n $RUN_PID ]] && kill -TERM -- "-$RUN_PID" 2>/dev/null
  [[ -n $GATE_PID ]] && kill -TERM "$GATE_PID" 2>/dev/null
  return 0
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

setsid nohup "$GATE_BIN" --dir "$HF_GATE_DIR" --hf-api "$HF_BIN" \
  --ledger "$HF_STATE/ledger.jsonl" --key "$HF_STATE/key" \
  --budget "$HF_BUDGET_USD" --stream "$PWD/run.jsonl" --model claude-opus-5-5 \
  > gate.out 2>&1 < /dev/null &
for _ in $(seq 50); do [[ -s $HF_GATE_DIR/ready ]] && break; sleep 0.2; done
GATE_PID=$(cat "$HF_GATE_DIR/ready" 2>/dev/null) && kill -0 "$GATE_PID" 2>/dev/null \
  || { GATE_PID=""; no_run "gate not ready: $(cat gate.out)"; }

SID=$(uuidgen)
setsid claude -p "$(cat user-prompt.txt)" \
  --model claude-opus-5-5 \
  --session-id "$SID" \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --disable-slash-commands \
  --setting-sources "" --settings ./run-settings.json \
  --permission-mode dontAsk \
  --append-system-prompt-file ./run-rules.md \
  --allowedTools "Bash(hf-api *)" "Bash(ffmpeg *)" "Bash(ffprobe *)" "Read(./**)" "Write(./**)" "Edit(./**)" \
  --disallowedTools "Bash(curl *)" "Bash(wget *)" "Read(~/.hf-api/**)" "Edit(~/.hf-api/**)" \
  --max-budget-usd 20 \
  --output-format stream-json --verbose > run.jsonl &
RUN_PID=$!
echo "$RUN_PID" > "$HF_GATE_DIR/run.pid"
wait "$RUN_PID" || true
RUN_PID=""
wait_gate=0; while kill -0 "$GATE_PID" 2>/dev/null && (( wait_gate++ < 30 )); do sleep 1; done
[[ ! -e $HF_GATE_DIR/tripped ]] || { echo "gate tripped: $(cat "$HF_GATE_DIR/tripped")" >&2; exit 3; }
kill -0 "$GATE_PID" 2>/dev/null && { echo "gate did not finish; treat the run as tripped" >&2; exit 3; }
GATE_PID=""

jq -c 'select(.type=="system" and .subtype=="init")
  | {model, mcp: (.mcp_servers | length), skills: ((.skills // []) | length)}' run.jsonl
```

Adjust `--allowedTools` to what the edit needs, but keep every added command sandboxed: never add to `excludedCommands`, and never allow `Bash(*)`. `claude-opus-5-5` is the Claude Opus 5.5 model ID.

**Pricing.** Kling 3.0 Pro image-to-video runs about $0.15–0.19 per 3 s clip and $0.25–0.31 per 5 s clip. Treat these as a guide and use `hf-api estimate` for the real number.

**If a background render dies,** resume the same session rather than starting over. Start a fresh gate first (the resumed run emits a new `init` event), exactly as above:

```bash
setsid claude -p --resume "$SID" "The render stopped. Re-run it in the foreground and continue." \
  <same flags as above, minus --session-id>
```

**If the API is unreachable,** stop and report. Do not switch to alternative video paths.

**Credentials.** Place the key only for the run, never print it, and scan every log (`run.jsonl`, `gate.out`, `$HF_GATE_DIR/gate.log`, render logs) for the key ID, the secret, and `Authorization: Key` strings. Then delete the key file.

### 3. Music

Preferred method (run by the user in Suno):

1. Give the user the rough cut with its placeholder audio.
2. The user uploads it to Suno as the input source and prompts a score to match, for example "score this as 80s cyberpunk, 17 seconds".
3. Suno returns a track timed to the picture. Ask for the length you need: social ~15–18 s, commercial ~35 s.

When the user supplies tracks, detect BPM and downbeats, pick the offset that lands downbeats on picture cuts, and trim cleanly. Do not time-stretch unless asked.

For a track slightly longer than the picture, hold the end card with a slow push-in and moving grain instead of re-cutting the body:

```bash
ffmpeg -loop 1 -framerate 30 -i endcard.png \
  -vf "scale=3840:-2,zoompan=z='1+0.04*on/90':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,noise=alls=10:allf=t+u,format=yuv420p" \
  -t 3 -c:v libx264 -crf 16 endcard-hold.mp4
```

Set `-t` to the extra seconds needed and match the divisor in `on/90` to `-t` × 30.

### 4. Sound effects and mix

- Keep the coding model's sound effects by regenerating them from its SFX script with the music parts removed. No stem separation needed.
- Retune tonal hits to the track's key.
- Cut the low end of impacts ~6 dB (for example `lowshelf=f=120:g=-6`).
- Seat the SFX ~6–7 LU under the music. Measure both layers with `ebur128` and set the SFX gain from the difference before mixing with `amix=inputs=2:normalize=0`.

### 5. Loudness

Normalize every deliverable to -14 LUFS integrated with true peak at or below -1 dBTP. Use two-pass loudnorm with the video stream copied:

```bash
# Pass 1: measure
ffmpeg -hide_banner -nostats -i mix-master.mp4 -map 0:a:0 \
  -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 \
  | sed -n '/^{/,/^}/p' > loudnorm.json

# Pass 2: apply measured values, copy video
ffmpeg -i mix-master.mp4 -map 0:v:0 -map 0:a:0 -c:v copy \
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(jq -r .input_i loudnorm.json):measured_TP=$(jq -r .input_tp loudnorm.json):measured_LRA=$(jq -r .input_lra loudnorm.json):measured_thresh=$(jq -r .input_thresh loudnorm.json):offset=$(jq -r .target_offset loudnorm.json):linear=true" \
  -c:a aac -b:a 192k -ar 48000 master-14lufs.mp4
```

loudnorm resamples internally, so keep `-ar 48000` on the output.

### 6. Delivery exports

Keep the high-bitrate master for archive only. High@5.0 at 17+ Mbps, or files with the moov atom at the end, stutter or freeze in QuickTime and Discord. For anything people will play or upload, re-export:

H.264 Main 4.1, yuv420p, 30 fps CFR, ~10 Mbps capped (maxrate = bufsize), 1 s closed GOP, AAC 192k 48 kHz, `+faststart`, metadata stripped.

```bash
ffmpeg -i master-14lufs.mp4 -map 0:v:0 -map 0:a:0 \
  -vf "scale=w='min(iw,if(gt(iw,ih),1920,1080))':h='min(ih,if(gt(iw,ih),1080,1920))':force_original_aspect_ratio=decrease:force_divisible_by=2" \
  -c:v libx264 -preset slow -profile:v main -level:v 4.1 -pix_fmt yuv420p \
  -r 30 -fps_mode cfr -b:v 10M -maxrate 10M -bufsize 10M \
  -g 30 -keyint_min 30 -sc_threshold 0 -flags +cgop \
  -c:a aac -b:a 192k -ar 48000 \
  -map_metadata -1 -map_chapters -1 -movflags +faststart \
  promo.mp4
```

Level 4.1 allows 8192 macroblocks per frame at up to 245760 macroblocks per second, which is 1080p30. The scale filter fits a landscape master inside 1920x1080 and a portrait or square one inside 1080x1920 (8160 macroblocks either way), keeping the aspect ratio, so a 4K or 9:16 master never produces a frame over the level. Capping only the width is not enough: a 2160x3840 portrait master would come out 1920x3414.

**Discord copy under 10 MB.** Size the video bitrate from the duration: video kbps ≈ 9.5 MB × 8000 ÷ seconds − 192. About 3.8 Mbps for ~18 s. For a ~35 s cut, drop to 720p and about 1.9 Mbps.

```bash
ffmpeg -i master-14lufs.mp4 -map 0:v:0 -map 0:a:0 \
  -vf "scale=-2:720" \
  -c:v libx264 -preset slow -profile:v main -level:v 4.1 -pix_fmt yuv420p \
  -r 30 -fps_mode cfr -b:v 3800k -maxrate 3800k -bufsize 3800k \
  -g 30 -keyint_min 30 -sc_threshold 0 -flags +cgop \
  -c:a aac -b:a 192k -ar 48000 \
  -map_metadata -1 -map_chapters -1 -movflags +faststart \
  promo-discord.mp4
```

**Stills.** Deliver 4 stills from strong moments (set the timestamps to the cut's actual beats):

```bash
for t in 2 6 10 15; do ffmpeg -ss "$t" -i promo.mp4 -frames:v 1 "still-$t.png"; done
```

**Checks before hand-off.**

- `ffprobe -v error -show_entries stream=codec_name,profile,level,pix_fmt,avg_frame_rate,sample_rate -of compact promo.mp4` shows Main, level 41, yuv420p, 30/1, 48000.
- `ffmpeg -i promo.mp4 -map 0:a:0 -af ebur128=peak=true -f null -` shows about -14 LUFS integrated and true peak at or below -1 dBTP. The AAC re-encode in the export can shift peaks slightly; re-run Step 5 on the export if it drifts.
- The Discord file is under 10 MB.
- Check the end-card spelling in every version.

### 7. Deliver

Send the video files and stills with the total cost, a remaining-balance estimate from the ledger, and a note on anything not verified by listening.

## Rules

- **No hard-coded counts in bopen.ai promos.** Agent and skill counts change over time. Never put a number of agents or skills in the storyboard, captions, or end card. Show scale visually instead.
- Real product UI is always a real capture.
- No video spend before the user approves the keyframes.
- The coding model reaches Higgsfield only through `hf-api`, under a hard budget cap.
- No spend-capable step runs before the gate reports `ready`; `hf-api generate` refuses until the gate arms the run.
- If the API is unreachable, stop and report. No fallback video paths.

## Checklist

- [ ] ~10–12 flare keyframes proposing new scenes; contact sheet shown; user approved
- [ ] Gate ready before launch; run armed only after init showed Opus, 0 MCP servers, 0 skills; no `tripped` file
- [ ] Opus run: prompt verbatim, video plugins off, `HF_BUDGET_USD` and `--max-budget-usd` both set
- [ ] Renders ran in the foreground; any dead render resumed in the same session
- [ ] Key never printed; logs scanned; key file deleted
- [ ] Music beat-aligned; SFX regenerated without music, lows cut ~6 dB, ~6–7 LU under music
- [ ] -14 LUFS integrated, true peak ≤ -1 dBTP on every deliverable
- [ ] Delivery export and Discord copy (< 10 MB) pass the ffprobe checks; master kept as archive only
- [ ] 4 stills; end-card spelling checked in all versions; no hard-coded counts
- [ ] Cost and remaining budget reported
