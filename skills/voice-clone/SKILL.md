---
name: voice-clone
version: 1.0.1
description: Clone real or fictional voices using ElevenLabs Instant Voice Cloning (IVC). This skill chains together the full pipeline — finding reference audio, preparing samples, uploading to ElevenLabs IVC, testing the clone with text-to-speech, and tuning voice settings. Use this skill whenever the user wants to clone a voice, create a custom voice from audio samples, replicate a famous voice style, or build a voice for a character. Covers celebrity impressions, fictional characters, branded voices, and personal voice clones.
---

# Voice Clone

Clone voices end-to-end using ElevenLabs Instant Voice Cloning (IVC). This skill handles the full pipeline from finding reference audio to a tuned, ready-to-use voice. For user-facing setup guidance, audio quality advice, voice type tips, IVC limits, and example walkthroughs, see `README.md`.

## Pipeline Overview

```
1. Source Audio    →  Find/download reference clips of the target voice
2. Prepare        →  Trim, normalize, ensure clean speech-only audio
3. Clone (IVC)    →  Upload samples to ElevenLabs Instant Voice Cloning
4. Test           →  Generate speech with the new voice, compare to reference
5. Tune           →  Adjust stability/similarity/style settings for best match
```

Each step is handled by `scripts/voice-clone.ts`. Run the full pipeline or individual steps.

## Step 1: Source Reference Audio

Verify `ELEVENLABS_API_KEY` is set before starting. Accept local file paths or URLs.

```bash
# Download audio from a URL
bun run scripts/voice-clone.ts source \
  --url "https://example.com/interview.mp3" \
  --output-dir ./voice-samples

# Use local files
bun run scripts/voice-clone.ts source \
  --files "./samples/clip1.mp3,./samples/clip2.wav" \
  --output-dir ./voice-samples
```

### yt-dlp for YouTube/Video Sources

```bash
# Download audio only
yt-dlp -x --audio-format mp3 --audio-quality 0 \
  -o "./voice-samples/%(title)s.%(ext)s" \
  "https://youtube.com/watch?v=VIDEO_ID"

# Download specific time range (requires ffmpeg)
yt-dlp -x --audio-format mp3 \
  --postprocessor-args "ffmpeg:-ss 00:01:30 -to 00:03:45" \
  -o "./voice-samples/clip.%(ext)s" \
  "https://youtube.com/watch?v=VIDEO_ID"
```

## Step 2: Prepare Samples

Trim silence, normalize volume, and optionally remove background noise. Requires ffmpeg.

```bash
# Prepare all files in a directory
bun run scripts/voice-clone.ts prepare \
  --input-dir ./voice-samples \
  --output-dir ./voice-prepared

# With options
bun run scripts/voice-clone.ts prepare \
  --input-dir ./voice-samples \
  --output-dir ./voice-prepared \
  --trim-silence \
  --normalize \
  --max-duration 60
```

The script validates ffmpeg is installed and exits with an informative error if not.

## Step 3: Clone via IVC

Upload prepared samples to ElevenLabs IVC. The API key must be set in the environment.

```bash
# Clone from prepared samples
bun run scripts/voice-clone.ts clone \
  --input-dir ./voice-prepared \
  --name "Movie Announcer" \
  --description "Deep dramatic voice in the style of classic movie trailers" \
  --remove-background-noise

# With labels for organization
bun run scripts/voice-clone.ts clone \
  --input-dir ./voice-prepared \
  --name "Movie Announcer" \
  --description "Deep dramatic voice" \
  --labels '{"accent":"american","age":"middle-aged","gender":"male","use_case":"trailer_narration"}'
```

The script outputs the `voice_id` on success. Capture and surface this to the user — it is needed for all subsequent steps.

## Step 4: Test the Clone

Generate test speech and output audio files so the user can compare against reference.

```bash
# Quick test with default phrases
bun run scripts/voice-clone.ts test \
  --voice-id "VOICE_ID_FROM_STEP_3" \
  --output-dir ./voice-tests

# Test with custom text
bun run scripts/voice-clone.ts test \
  --voice-id "VOICE_ID_FROM_STEP_3" \
  --text "In a world where darkness threatens to consume all hope..." \
  --output-dir ./voice-tests

# Test with specific model
bun run scripts/voice-clone.ts test \
  --voice-id "VOICE_ID_FROM_STEP_3" \
  --model eleven_v3 \
  --output-dir ./voice-tests
```

Report the output file paths to the user after this step completes.

## Step 5: Tune Voice Settings

Adjust stability, similarity boost, and style to dial in the match.

```bash
bun run scripts/voice-clone.ts tune \
  --voice-id "VOICE_ID_FROM_STEP_3" \
  --stability 0.3 \
  --similarity-boost 0.8 \
  --style 0.5 \
  --text "In a world where nothing is as it seems..." \
  --output-dir ./voice-tests
```

When the user does not specify settings, use these defaults: stability 0.5, similarity-boost 0.75, style 0.0. For voice type presets, refer to `README.md`.

## Full Pipeline (One Command)

```bash
bun run scripts/voice-clone.ts pipeline \
  --files "./samples/clip1.mp3,./samples/clip2.mp3" \
  --name "Movie Announcer" \
  --description "Deep dramatic voice for movie trailers" \
  --test-text "In a world where heroes are forgotten..." \
  --remove-background-noise \
  --output-dir ./movie-announcer-voice
```

Runs source → prepare → clone → test in sequence. Output includes the voice_id and paths to test audio files.

## Managing Voices

```bash
# List all cloned voices
bun run scripts/voice-clone.ts list

# Delete a cloned voice
bun run scripts/voice-clone.ts delete --voice-id "VOICE_ID"

# Get details about a voice
bun run scripts/voice-clone.ts info --voice-id "VOICE_ID"
```

## Error Handling

- If `ELEVENLABS_API_KEY` is unset, exit immediately with a message directing the user to `README.md` for setup instructions.
- If ffmpeg is missing, exit with an install prompt (`brew install ffmpeg`).
- If the IVC API returns a tier error, inform the user that IVC requires Starter tier or above and link to `README.md` for tier details.
- If `voice_id` is needed but not yet obtained, prompt the user to complete Step 3 first.
