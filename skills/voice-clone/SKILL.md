---
name: voice-clone
version: 1.0.0
description: Clone real or fictional voices using ElevenLabs Instant Voice Cloning (IVC). This skill chains together the full pipeline — finding reference audio, preparing samples, uploading to ElevenLabs IVC, testing the clone with text-to-speech, and tuning voice settings. Use this skill whenever the user wants to clone a voice, create a custom voice from audio samples, replicate a famous voice style, or build a voice for a character. Covers celebrity impressions, fictional characters, branded voices, and personal voice clones.
---

# Voice Clone

Clone voices end-to-end using ElevenLabs Instant Voice Cloning (IVC). This skill handles the full pipeline from finding reference audio to a tuned, ready-to-use voice.

## Prerequisites

```bash
# ElevenLabs API key must be set
echo $ELEVENLABS_API_KEY

# If not set: https://elevenlabs.io → Profile → API Keys
# Add to shell profile: export ELEVENLABS_API_KEY="your-key"

# IVC requires Starter tier or above
# Check your tier: curl -s https://api.elevenlabs.io/v1/user \
#   -H "xi-api-key: $ELEVENLABS_API_KEY" | jq '.subscription.tier'
```

## Pipeline Overview

```
1. Source Audio    →  Find/download reference clips of the target voice
2. Prepare        →  Trim, normalize, ensure clean speech-only audio
3. Clone (IVC)    →  Upload samples to ElevenLabs Instant Voice Cloning
4. Test           →  Generate speech with the new voice, compare to reference
5. Tune           →  Adjust stability/similarity/style settings for best match
```

Each step is handled by the `scripts/voice-clone.ts` script. You can run the full pipeline or individual steps.

## Step 1: Source Reference Audio

Good clones start with good samples. The script can download audio from URLs or use local files.

**What makes good reference audio:**
- Clear speech with minimal background noise
- 1-5 minutes total across all samples (more isn't always better for IVC)
- Varied intonation — don't use monotone reads
- Multiple clips are better than one long clip
- MP3, WAV, or M4A format

**For famous/iconic voices**, search for:
- Interview clips, press junkets, behind-the-scenes footage
- Isolated vocal tracks (search "voice isolated" or "acapella")
- Podcast appearances (often cleanest audio)

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

### Using yt-dlp for YouTube/Video Sources

For YouTube interviews, speeches, or other video sources:

```bash
# Install yt-dlp if needed
brew install yt-dlp  # or: bun add -g yt-dlp

# Download audio only from a video
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

Trim silence, normalize volume, and optionally remove background noise. Uses ffmpeg for processing.

```bash
# Prepare all files in a directory
bun run scripts/voice-clone.ts prepare \
  --input-dir ./voice-samples \
  --output-dir ./voice-prepared

# Options
bun run scripts/voice-clone.ts prepare \
  --input-dir ./voice-samples \
  --output-dir ./voice-prepared \
  --trim-silence          # Remove leading/trailing silence
  --normalize             # Normalize to -16 LUFS
  --max-duration 60       # Trim clips to max 60 seconds each
```

**ffmpeg must be installed** (`brew install ffmpeg`). The script validates this before proceeding.

## Step 3: Clone via IVC

Upload prepared samples to ElevenLabs Instant Voice Cloning.

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

The script outputs the `voice_id` on success. Save this — you need it for testing and TTS.

## Step 4: Test the Clone

Generate test speech to compare against the reference. The script produces test audio files and prints the voice_id for further use.

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

**Listen to the output** and compare with reference audio. If the voice sounds off, try:
- Different reference samples (quality matters more than quantity)
- Enabling `--remove-background-noise` during clone step
- Adjusting settings in Step 5

## Step 5: Tune Voice Settings

Adjust stability, similarity boost, and style to dial in the voice.

```bash
# Tune and regenerate test audio
bun run scripts/voice-clone.ts tune \
  --voice-id "VOICE_ID_FROM_STEP_3" \
  --stability 0.3 \
  --similarity-boost 0.8 \
  --style 0.5 \
  --text "In a world where nothing is as it seems..." \
  --output-dir ./voice-tests
```

**Settings guide:**

| Setting | Low (0.0) | High (1.0) | Default |
|---------|-----------|------------|---------|
| `stability` | More expressive, varied | More consistent, monotone | 0.5 |
| `similarity-boost` | More generic | Closer to original voice | 0.75 |
| `style` | Neutral delivery | More stylistic/dramatic | 0.0 |

**Tips for specific voice types:**
- **Dramatic narrator**: stability 0.25-0.35, similarity 0.8, style 0.5-0.7
- **Professional voiceover**: stability 0.5, similarity 0.75, style 0.2
- **Character voice**: stability 0.3, similarity 0.85, style 0.6
- **Natural conversational**: stability 0.5, similarity 0.7, style 0.3

## Full Pipeline (One Command)

Run all steps in sequence:

```bash
bun run scripts/voice-clone.ts pipeline \
  --files "./samples/clip1.mp3,./samples/clip2.mp3" \
  --name "Movie Announcer" \
  --description "Deep dramatic voice for movie trailers" \
  --test-text "In a world where heroes are forgotten..." \
  --remove-background-noise \
  --output-dir ./movie-announcer-voice
```

This runs source → prepare → clone → test in sequence and outputs a summary with the voice_id and test audio paths.

## Managing Voices

```bash
# List all your cloned voices
bun run scripts/voice-clone.ts list

# Delete a cloned voice
bun run scripts/voice-clone.ts delete --voice-id "VOICE_ID"

# Get details about a voice
bun run scripts/voice-clone.ts info --voice-id "VOICE_ID"
```

## IVC Limitations

- **Starter tier**: Up to 10 custom voices, 65 total voice add/edits
- **Max samples**: 25 files per voice
- **Max file size**: 10MB per file
- **Supported formats**: MP3, WAV, M4A, FLAC, OGG, WEBM
- **Best results**: 1-3 minutes of clean, varied speech
- **No fine-tuning**: IVC is instant — what you get is what you get. If unhappy, try different samples or settings.

## Example: Movie Trailer Voice

```bash
# 1. Download Don LaFontaine-style reference clips
yt-dlp -x --audio-format mp3 --audio-quality 0 \
  -o "./movie-voice/samples/%(title)s.%(ext)s" \
  "https://youtube.com/watch?v=REFERENCE_VIDEO_ID"

# 2. Run the full pipeline
bun run scripts/voice-clone.ts pipeline \
  --input-dir ./movie-voice/samples \
  --name "Epic Trailer Voice" \
  --description "Deep, dramatic movie trailer narrator. Gravelly baritone with commanding presence." \
  --test-text "In a world where darkness threatens everything... one voice... will change it all." \
  --remove-background-noise \
  --labels '{"accent":"american","gender":"male","use_case":"trailer_narration"}' \
  --output-dir ./movie-voice

# 3. Fine-tune for maximum drama
bun run scripts/voice-clone.ts tune \
  --voice-id "VOICE_ID" \
  --stability 0.25 \
  --similarity-boost 0.85 \
  --style 0.7 \
  --text "This summer... prepare yourself... for the ride of a lifetime." \
  --output-dir ./movie-voice/tuned
```
