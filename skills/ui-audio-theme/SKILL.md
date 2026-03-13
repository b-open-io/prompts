---
version: 1.0.1
name: ui-audio-theme
description: Generate cohesive UI audio themes with subtle, minimal sound effects for applications. This skill should be used when users want to create a set of coordinated interface sounds for wallet apps, dashboards, or web applications - generating sounds mapped to UI interaction constants like button clicks, notifications, and navigation transitions using ElevenLabs API.
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
