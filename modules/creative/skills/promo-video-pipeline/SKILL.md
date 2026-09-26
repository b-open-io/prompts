---
name: promo-video-pipeline
version: 0.0.1
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
- Claude Code CLI with access to Claude Opus 5.5.
- Higgsfield API credentials (key ID and secret) and the `hf-api` wrapper described below.
- ffmpeg 5.1 or newer (`-fps_mode` replaced the deprecated `-vsync`), ffprobe, and `jq`.
- The user's own Suno account if they want a scored track.

### The `hf-api` wrapper

The coding model calls Higgsfield only through a CLI wrapper named `hf-api`. It is not published in any public b-open-io repository. Build or supply one that meets this contract:

| Command | Contract |
|---------|----------|
| `generate` | Submit a generation request. Refuse if the ledger total plus the estimate would exceed the budget cap. Append the request ID, model, parameters, and estimated cost to the ledger. |
| `status` | Poll a request by ID and download finished output right away; do not rely on Higgsfield keeping it. |
| `estimate` | Price a request before submitting it (Higgsfield exposes an estimate endpoint). |
| `balance` | Report spend and remaining budget from the ledger. The REST API has no balance endpoint, so the ledger is the only record. |
| `cancel` | Cancel a queued request. Higgsfield can cancel only before processing starts; refunded cancels go in the ledger. |

Auth is the header `Authorization: Key ID:SECRET` against `https://api.higgsfield.ai`. The wrapper reads the key from a file only it uses. The coding model never sees the key.

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

**Prompt.** Pass the user's prompt verbatim. Only adapt length or purpose if the user asked. Add, as separate inputs: the approved keyframe paths, reusable clips from earlier runs, the music track if supplied, and hard constraints (exact CTA text, locked narration, which shots must be real captures). Put run rules in an appended system prompt so the user's text stays untouched:

- Generate video only through `hf-api`. Stay under the budget cap.
- Render in the foreground and wait for each render to finish. Background renders die when the headless turn ends.
- Write an SFX script alongside the edit that lists every sound effect with its timecode.
- Do not hard-code counts that change over time (see Rules).

**Config.**

- Empty strict MCP config: `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`.
- `--disable-slash-commands`, which turns off all skills and commands.
- HyperFrames and any other video plugins disabled for the run (`enabledPlugins` set to `false` in a run-only `--settings` file).
- A hard budget cap for video spend, enforced by the `hf-api` ledger. `--max-budget-usd` caps model spend separately and is worth setting too.
- At start, check the `system`/`init` event: 0 MCP servers and 0 skills, and the model is Claude Opus 5.5. If either count is non-zero, stop and fix the config before any spend.

**Gate logger.** Before launching, start a gate process detached with `setsid nohup` so it outlives the shell that started it. It logs every `hf-api` call and kills the run if the coding model tampers with the CLI or ledger, reads the key file, or calls the API directly.

```bash
setsid nohup ./gate-logger > gate.log 2>&1 < /dev/null &

SID=$(uuidgen)
claude -p "$(cat user-prompt.txt)" \
  --model claude-opus-5-5 \
  --session-id "$SID" \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --disable-slash-commands \
  --settings ./run-settings.json \
  --append-system-prompt-file ./run-rules.md \
  --allowedTools "Bash(hf-api *)" "Bash(ffmpeg *)" "Bash(ffprobe *)" Read Write Edit \
  --disallowedTools "Bash(curl *)" "Bash(wget *)" \
  --max-budget-usd 20 \
  --output-format stream-json --verbose > run.jsonl

jq -c 'select(.type=="system" and .subtype=="init")
  | {model, mcp: (.mcp_servers | length), skills: ((.skills // []) | length)}' run.jsonl
```

Adjust `--allowedTools` to what the edit needs. `claude-opus-5-5` is the Claude Opus 5.5 model ID.

**Pricing.** Kling 3.0 Pro image-to-video runs about $0.15–0.19 per 3 s clip and $0.25–0.31 per 5 s clip. Treat these as a guide and use `hf-api estimate` for the real number.

**If a background render dies,** resume the same session rather than starting over:

```bash
claude -p --resume "$SID" "The render stopped. Re-run it in the foreground and continue." \
  <same flags as above, minus --session-id>
```

**If the API is unreachable,** stop and report. Do not switch to alternative video paths.

**Credentials.** Place the key only for the run, never print it, and scan every log (`run.jsonl`, `gate.log`, render logs) for the key ID, the secret, and `Authorization: Key` strings. Then delete the key file.

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
  -vf "scale='min(1920,iw)':-2" \
  -c:v libx264 -preset slow -profile:v main -level:v 4.1 -pix_fmt yuv420p \
  -r 30 -fps_mode cfr -b:v 10M -maxrate 10M -bufsize 10M \
  -g 30 -keyint_min 30 -sc_threshold 0 -flags +cgop \
  -c:a aac -b:a 192k -ar 48000 \
  -map_metadata -1 -map_chapters -1 -movflags +faststart \
  promo.mp4
```

Level 4.1 tops out at 1080p30, so the scale filter caps width at 1920. A vertical 1080x1920 cut also fits.

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
- If the API is unreachable, stop and report. No fallback video paths.

## Checklist

- [ ] ~10–12 flare keyframes proposing new scenes; contact sheet shown; user approved
- [ ] Opus run: prompt verbatim, 0 MCP servers, 0 skills, video plugins off, budget cap set, gate logger running detached
- [ ] Renders ran in the foreground; any dead render resumed in the same session
- [ ] Key never printed; logs scanned; key file deleted
- [ ] Music beat-aligned; SFX regenerated without music, lows cut ~6 dB, ~6–7 LU under music
- [ ] -14 LUFS integrated, true peak ≤ -1 dBTP on every deliverable
- [ ] Delivery export and Discord copy (< 10 MB) pass the ffprobe checks; master kept as archive only
- [ ] 4 stills; end-card spelling checked in all versions; no hard-coded counts
- [ ] Cost and remaining budget reported
