---
version: 1.0.5
name: ui-audio-theme
description: Generate cohesive UI audio themes with subtle, minimal sound effects for applications. This skill should be used when users want to create a set of coordinated interface sounds for wallet apps, dashboards, or web applications - generating sounds mapped to UI interaction constants like button clicks, notifications, and navigation transitions using ElevenLabs API. Ships an interactive local sound picker (web UI) for auditioning unlimited candidates per slot with editable prompts and one-click accept into the theme, plus guidance for artifact-based audition boards. All output is peak-normalized so quiet vibes stay audible.
location: user
---

# UI Audio Theme Generator

Generate cohesive sets of subtle, minimal UI sound effects using ElevenLabs text-to-sound-effects API. Create "audio themes" — coordinated sets of sounds that share a common aesthetic and map to standard UI interaction constants.

Requires `ELEVENLABS_API_KEY` set in the environment. See README.md for setup instructions.

## Workflow

### Step 1: Discover the UI Vibe

Before generating sounds, understand the application's aesthetic:

**Application Context:**
- What type of app? (wallet, dashboard, social, productivity)
- Primary user emotion? (trust, delight, focus, calm)
- Professional or playful interface?

**Audio Direction:**
- Preferred tone? (warm/organic, clean/digital, retro/nostalgic, futuristic)
- Reference sounds? (Apple-like clicks, game bleeps, banking chimes)

### Step 2: Select a Vibe Preset

Available presets in `assets/vibe-presets.json`:

| Preset | Tone | Best For |
|--------|------|----------|
| `corporate-trust` | Warm, professional | Banking, finance |
| `crypto-modern` | Digital, clean | Wallet apps, trading |
| `playful-delight` | Bright, friendly | Social, consumer |
| `minimal-focus` | Ultra-subtle | Productivity, tools |
| `retro-digital` | 8-bit inspired | Games, nostalgic |
| `pixel-minimal` | Quiet 8-bit | Pixel-art sites, retro dashboards |
| `premium-luxury` | Rich, refined | High-end apps |

### Step 3: Generate the Audio Theme

```bash
# Using preset vibe
python scripts/generate_theme.py \
  --vibe "crypto-modern" \
  --output-dir "./audio-theme"

# Using custom vibe description
python scripts/generate_theme.py \
  --vibe-custom "warm organic subtle wooden interface sounds" \
  --output-dir "./audio-theme"

# Generate specific categories only
python scripts/generate_theme.py \
  --vibe "crypto-modern" \
  --categories buttons feedback transactions \
  --output-dir "./audio-theme"

# List available presets
python scripts/generate_theme.py --list-vibes

# List all sound names
python scripts/generate_theme.py --list-sounds
```

### Step 4: Regenerate Individual Sounds

```bash
python scripts/generate_theme.py \
  --regenerate "button-click-primary,notification-success" \
  --vibe "crypto-modern" \
  --output-dir "./audio-theme"
```

### Step 5: Audition and Refine (Interactive Picker)

Taste can't be automated — after generating a baseline, let the user audition
each slot and iterate. Two strategies; pick by runtime:

**A. Local picker server (default — works in Claude Code AND Codex):**

```bash
python scripts/sound_picker.py --vibe pixel-minimal --output-dir ./audio-theme
# → http://127.0.0.1:7777
```

Serves a local page with, per sound slot: a play button for the current file,
an editable generation prompt (pre-filled from the vibe), "Generate next" for
unlimited fresh candidates via ElevenLabs (auto-normalized), and per-candidate
"Accept" buttons that write the winner into the theme directory and record the
winning prompt in `theme.json`. Run it in the background, hand the user the
URL, and continue once they've picked. No CSP constraints because it's
localhost.

**B. Artifact audition board (Claude Code only, when a hosted page is
preferred):** hosted Artifacts enforce a strict CSP — no external requests, so
live generation inside the artifact is impossible. Instead: pre-generate 2-4
candidates per slot with `--regenerate`, embed each mp3 as a base64 `data:` URI
in an HTML page with play buttons and the prompt shown per candidate, publish
via the Artifact tool, and let the user reply with picks and prompt tweaks for
the next batch round. Iterative rounds instead of infinite Next; keep
candidate counts small — base64 audio inflates page size ~33%.

## Loudness Normalization

ElevenLabs SFX loudness tracks the prompt wording — "quiet"/"subtle" vibes can
come back peaking at -31 dBFS, inaudible once an app applies its own 20-40% UI
volume. The generator therefore peak-normalizes every file to -3 dBFS by
default (requires `ffmpeg`; pass `--no-normalize` to keep raw output). Keep
the vibe words for timbre; let the app's volume setting control loudness.

## Integration Gotchas

- **Autoplay policy**: browsers block ALL audio until the user's first
  click/tap/keypress on the page. Hover-triggered sounds only work after that
  first gesture — this is a hard browser rule, not an implementation choice.
- **Hover cues**: play them 40-60% quieter than clicks and throttle (~90ms) so
  cursor sweeps across menus don't machine-gun.
- **Verify audibly, not just mechanically**: `audio.play()` resolving proves
  playback, not perceptibility. Check peaks with
  `ffmpeg -i file.mp3 -af volumedetect -f null -` and listen at the app's
  actual volume multiplier before shipping.

## Sound Categories

### Buttons
| Constant | Description |
|----------|-------------|
| `button-click-primary` | Main action buttons |
| `button-click-secondary` | Secondary/ghost buttons |
| `button-click-destructive` | Delete/cancel actions |

### Navigation
| Constant | Description |
|----------|-------------|
| `nav-tab-switch` | Tab navigation |
| `nav-back` | Back button/gesture |
| `nav-forward` | Forward navigation |
| `nav-menu-open` | Menu drawer open |
| `nav-menu-close` | Menu dismiss |

### Feedback
| Constant | Description |
|----------|-------------|
| `notification-success` | Success confirmation |
| `notification-error` | Error alert |
| `notification-warning` | Warning indicator |
| `notification-info` | Information notice |
| `notification-badge` | Badge/counter update |

### States
| Constant | Description |
|----------|-------------|
| `toggle-on` | Switch enabled |
| `toggle-off` | Switch disabled |
| `checkbox-check` | Checkbox selected |
| `checkbox-uncheck` | Checkbox deselected |
| `loading-start` | Loading initiated |
| `loading-complete` | Loading finished |

### Modals
| Constant | Description |
|----------|-------------|
| `modal-open` | Modal appearance |
| `modal-close` | Modal dismissal |
| `tooltip-show` | Tooltip reveal |
| `dropdown-open` | Dropdown expand |
| `dropdown-close` | Dropdown collapse |

### Transactions (Wallet-specific)
| Constant | Description |
|----------|-------------|
| `tx-sent` | Transaction sent |
| `tx-received` | Payment received |
| `tx-pending` | Transaction waiting |
| `tx-confirmed` | Confirmation success |

## Output Structure

```
audio-theme/
├── theme.json              # Theme manifest
├── constants.ts            # TypeScript constants
├── buttons/
│   ├── button-click-primary.mp3
│   ├── button-click-secondary.mp3
│   └── button-click-destructive.mp3
├── navigation/
├── feedback/
├── states/
├── modals/
└── transactions/
```

## Script Options

```
--vibe NAME           Preset vibe name
--vibe-custom DESC    Custom vibe description
--output-dir PATH     Output directory (default: ./audio-theme)
--format FORMAT       mp3 or wav (default: mp3)
--categories CATS     Specific categories to generate
--regenerate SOUNDS   Comma-separated sounds to regenerate
--prompt-influence N  0-1, higher = stricter prompt adherence (default: 0.5)
--list-vibes          Show available presets
--list-sounds         Show all sound names
```

## Resources

- `scripts/generate_theme.py` — CLI tool for generating themes
- `references/sound-design-guide.md` — Detailed sound design best practices
- `assets/vibe-presets.json` — Predefined vibe configurations
- `assets/theme-template.json` — Example output manifest
- `README.md` — Prerequisites, design philosophy, integration examples (React hook, Howler.js), accessibility guidance
