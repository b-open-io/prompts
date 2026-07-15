---
version: 1.1.0
name: ui-audio-theme
description: >-
  This skill should be used when the user asks to "generate a UI sound theme",
  "create button click sounds for my app", "design notification sounds", or
  "build a coordinated audio theme for my dashboard or wallet app", "make game
  menu sounds", "create HUD feedback sounds", "design TV navigation sounds",
  "audit the sounds on my existing site", "check that transaction sounds are
  wired", "review UI audio wiring", or "edit a generated UI sound". Generates,
  audits, edits, and wires cohesive UI audio themes mapped to semantic
  interactions via ElevenLabs and ffmpeg, with an interactive local picker for
  auditioning, revising, reassigning, and accepting candidates.
location: user
---

# UI Audio Theme Generator

Generate cohesive sets of subtle, minimal UI sound effects using ElevenLabs text-to-sound-effects API. Create "audio themes" — coordinated sets of sounds that share a common aesthetic and map to standard UI interaction constants.

Requires `ELEVENLABS_API_KEY` set in the environment. See README.md for setup instructions.

## Relationship to game and television UI

This skill is the single owner of existing-product audio audits, semantic
event-to-sound maps, UI-sound candidate generation, visual audition,
non-destructive editing, normalization, accepted asset manifests, and reusable
sound-slot or picker improvements. `design-game-ui` owns the upstream semantic
feedback-event map for purpose-built game/TV interfaces: what each event means,
exactly when it fires, its required visual equivalent, repetition policy,
accessibility, and acceptance criteria.

When invoked from `design-game-ui`, consume that event map rather than
redesigning navigation or inventing raw-key-triggered sounds. Frames owns audio
production; the application engineer owns runtime playback lifecycle; the
game-UI lead accepts the integrated behavior. `voice-clone` is separate and
should be used only when the requested asset is spoken voice.

## Workflow

### Step 0: Audit an Existing Product

When an application already exists, or a new auth/payment/blockchain feature
landed after its theme was created, run the existing-app audit before generating
or rewiring sounds. Follow `references/audit-and-wiring.md`, copy
`assets/event-map-template.json`, and validate the completed map:

```bash
python scripts/audit_theme.py ./audio-event-map.json \
  --theme ./public/audio/ui/theme.json
```

Inventory semantic state transitions across routes, overlays, async work, auth,
payments, blockchain operations, keyboard, and gamepad input. Map each event to
a sound or documented intentional silence. Treat unused theme slots as
information, not a reason to invent noisy wiring. Require both source evidence
and audible browser evidence. Fix event boundaries before judging the assets.

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
unlimited fresh candidates via ElevenLabs (auto-normalized), and compact
always-open waveform cards. The selected take uses a persistent visual state,
and clicking any card's waveform opens the shared editor. Compact icon controls
support:

- accept the candidate into its current event slot;
- assign a good wrong-slot candidate to any other event without regenerating;
- open a visible waveform editor with draggable trim handles, click-to-seek,
  selection playback, and keyboard-adjustable trim boundaries;
- create a non-destructive revision with plainly labeled fade-in, fade-out,
  volume, reverb, delay-time, and delay-amount sliders; and
- delete disposable candidates and their derived revisions without deleting
  the accepted live theme file.

Every edit creates a new revision. Accepting a replacement snapshots the prior
accepted file into picker history first, so returning to an earlier version is
an ordinary audition-and-accept operation. The picker records prompt, source
slot, edit recipe, assignment provenance, and history in `theme.json`. Run it
in the background, hand the user the URL, and continue only after explicit
per-slot acceptance. No CSP constraints apply because it binds to localhost.

The picker is the default review interface, not an optional polish step. Give
the user the local URL and wait for explicit per-slot selections. Do not treat
the first generated baseline as accepted, and do not substitute filenames or a
written description for listening. After acceptance, return the recorded
winning prompts and event-to-file manifest to Frames or the implementation
owner.

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
- **Hover semantics**: use `nav-item-hover` for primary navigation/menu browse,
  `item-hover` for other interactive items, and `tooltip-show` only when a real
  tooltip becomes visible. Do not make tooltip audio the global hover sound.
- **Transactions**: place `tx-sent` after a wallet/network returns a broadcast
  transaction id, `tx-pending` on the transition into a meaningful waiting
  state, `tx-confirmed` on the first confirmed/fulfilled transition, and
  `tx-received` only in a receiver-facing UI. Never fire them on the button
  click that merely starts the operation.
- **Editing**: keep originals immutable, render revisions through bounded
  numeric ffmpeg filters without `shell=True`, leave output headroom, and retain
  a previous accepted snapshot before replacement. Never normalize an edited
  file in a way that cancels intentional gain changes.
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
| `item-hover` | General interactive item hover/focus |
| `nav-item-hover` | Primary navigation/menu item hover/focus |
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
├── .picker/                # Immutable candidates, revisions, and history
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
- `scripts/sound_picker.py` — Local audition, assignment, editing, and history UI
- `scripts/audit_theme.py` — Validate an existing app's semantic event map against its theme
- `references/audit-and-wiring.md` — Existing-product inventory, wiring, and evidence workflow
- `references/sound-design-guide.md` — Detailed sound design best practices
- `assets/vibe-presets.json` — Predefined vibe configurations
- `assets/theme-template.json` — Example output manifest
- `assets/event-map-template.json` — Auditable interaction-to-sound map template
- `README.md` — Prerequisites, design philosophy, integration examples (React hook, Howler.js), accessibility guidance
