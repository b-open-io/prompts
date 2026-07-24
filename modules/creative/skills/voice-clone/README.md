# Voice Clone

Clone real or fictional voices using ElevenLabs Instant Voice Cloning (IVC).

## What This Skill Does

This skill automates the full voice cloning pipeline: finding reference audio, preparing samples, uploading to ElevenLabs IVC, testing the clone with text-to-speech, and tuning voice settings until the result matches the target.

Use it to clone celebrity voices, fictional characters, branded voices, or your own voice.

## Prerequisites

### ElevenLabs Account and API Key

1. Create an account at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Profile → API Keys** and copy your key
3. Add to your shell profile:

```bash
export ELEVENLABS_API_KEY="your-key"
```

### Tier Requirement

IVC requires **Starter tier or above**. Free accounts cannot use voice cloning.

Check your current tier:

```bash
curl -s https://api.elevenlabs.io/v1/user \
  -H "xi-api-key: $ELEVENLABS_API_KEY" | jq '.subscription.tier'
```

### Dependencies

- **Bun** — runtime for the voice-clone.ts script
- **ffmpeg** — for audio preparation (`brew install ffmpeg`)
- **yt-dlp** — optional, for downloading from YouTube (`brew install yt-dlp`)

## What Makes Good Reference Audio

The quality of the clone depends heavily on reference audio quality. Good samples have:

- Clear speech with minimal background noise
- 1–5 minutes total across all samples (more is not always better for IVC)
- Varied intonation — avoid monotone reads
- Multiple clips rather than one long clip
- MP3, WAV, or M4A format

**For famous or iconic voices**, look for:
- Interview clips, press junkets, behind-the-scenes footage
- Isolated vocal tracks (search "voice isolated" or "acapella")
- Podcast appearances (often the cleanest audio available)

## Tips for Specific Voice Types

| Voice Type | Stability | Similarity Boost | Style |
|------------|-----------|-----------------|-------|
| Dramatic narrator | 0.25–0.35 | 0.8 | 0.5–0.7 |
| Professional voiceover | 0.5 | 0.75 | 0.2 |
| Character voice | 0.3 | 0.85 | 0.6 |
| Natural conversational | 0.5 | 0.7 | 0.3 |

**Settings reference:**

| Setting | Low (0.0) | High (1.0) | Default |
|---------|-----------|------------|---------|
| `stability` | More expressive, varied | More consistent, monotone | 0.5 |
| `similarity-boost` | More generic | Closer to original voice | 0.75 |
| `style` | Neutral delivery | More stylistic/dramatic | 0.0 |

## IVC Limitations

- **Starter tier**: Up to 10 custom voices, 65 total voice add/edits
- **Max samples per voice**: 25 files
- **Max file size**: 10MB per file
- **Supported formats**: MP3, WAV, M4A, FLAC, OGG, WEBM
- **Best results**: 1–3 minutes of clean, varied speech
- **No fine-tuning**: IVC is instant — if unhappy with results, try different samples or settings rather than expecting iterative model training

## Example: Movie Trailer Voice

This walkthrough clones a Don LaFontaine-style dramatic narrator voice.

**Step 1: Download reference audio from YouTube**

```bash
yt-dlp -x --audio-format mp3 --audio-quality 0 \
  -o "./movie-voice/samples/%(title)s.%(ext)s" \
  "https://youtube.com/watch?v=REFERENCE_VIDEO_ID"
```

**Step 2: Run the full pipeline**

```bash
bun run scripts/voice-clone.ts pipeline \
  --input-dir ./movie-voice/samples \
  --name "Epic Trailer Voice" \
  --description "Deep, dramatic movie trailer narrator. Gravelly baritone with commanding presence." \
  --test-text "In a world where darkness threatens everything... one voice... will change it all." \
  --remove-background-noise \
  --labels '{"accent":"american","gender":"male","use_case":"trailer_narration"}' \
  --output-dir ./movie-voice
```

**Step 3: Fine-tune for maximum drama**

```bash
bun run scripts/voice-clone.ts tune \
  --voice-id "VOICE_ID" \
  --stability 0.25 \
  --similarity-boost 0.85 \
  --style 0.7 \
  --text "This summer... prepare yourself... for the ride of a lifetime." \
  --output-dir ./movie-voice/tuned
```

Listen to the output in `./movie-voice/tuned` and compare with your reference clips. If the voice sounds off, try different reference samples — quality matters more than quantity.
