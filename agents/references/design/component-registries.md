# shadcn-Compatible Component Registries

All registries below use the `npx shadcn@latest add` CLI pattern. Components install directly into your codebase — no runtime dependencies on the registry itself.

## Spell UI

**Registry:** `https://spell.sh/r/{component}.json`
**Source:** [github.com/xxtomm/spell-ui](https://github.com/xxtomm/spell-ui)
**Docs:** [spell.sh/docs](https://spell.sh/docs)
**Aesthetic:** Premium, polished, animation-forward. Inspired by Vercel's design language with a magical twist.

```bash
# Install a component
npx shadcn@latest add "https://spell.sh/r/blur-reveal.json"
bunx shadcn@latest add "https://spell.sh/r/shimmer-text.json"
```

**Key dependency:** `motion/react` (most animated components)

### Complete Component List (29)

#### Text & Animation Effects
| Component | What it does |
|-----------|-------------|
| `blur-reveal` | Text reveal with blur-to-sharp animation |
| `shimmer-text` | Animated shimmer highlight sweeping across text |
| `highlighted-text` | Sliding background highlight with mix-blend-mode |
| `special-text` | Scramble/decode character animation |
| `slide-up-text` | Staggered slide-up entrance |
| `words-stagger` | Word-by-word blur + transform + opacity reveal |
| `randomized-text` | Character-by-character randomized reveal |
| `gradient-wave-text` | Apple-style animated gradient wave |

#### Buttons
| Component | What it does |
|-----------|-------------|
| `rich-button` | Styled button with color variants |
| `flow-button` | Animated flowing dashed border on hover |
| `pop-button` | 3D push-down animation effect |
| `copy-button` | Copy-to-clipboard with blur transition |

#### Inputs & Forms
| Component | What it does |
|-----------|-------------|
| `label-input` | Floating label input with password visibility toggle |
| `exploding-input` | Spawns particle effects while typing |
| `animated-checkbox` | Spring transitions with strike-through text |

#### Visual & Layout
| Component | What it does |
|-----------|-------------|
| `badge` | Multiple color variants and sizes |
| `color-selector` | Interactive color picker |
| `spinner` | Customizable loading spinner |
| `bars-spinner` | Rotating bars loading animation |
| `marquee` | Infinite scrolling with customizable speed/direction |
| `text-marquee` | Vertical scrolling text marquee |
| `logos-carousel` | Staggered logo set cycling animation |
| `keyboard-shortcuts` | Keyboard shortcut display with proper key symbols |
| `signature` | Handwriting animation with custom fonts |

#### Specialty & Embeds
| Component | What it does |
|-----------|-------------|
| `perspective-book` | 3D book with hover animation |
| `light-rays` | WebGL shader light ray effect |
| `animated-gradient` | WebGL animated gradient with swirl presets |
| `tweet` | Embedded Twitter/X post with custom styling |
| `spotify-card` | Spotify track card with blurred album art background |

### When to Use Spell UI

- **Landing pages** — blur-reveal, shimmer-text, gradient-wave-text for hero sections
- **Marketing sites** — logos-carousel, marquee, perspective-book for social proof
- **SaaS dashboards** — badge, keyboard-shortcuts, copy-button for utility
- **Interactive experiences** — exploding-input, animated-gradient, light-rays for wow factor

---

## shadcn/ui (Base)

**Registry:** Built-in to `npx shadcn@latest`
**Source:** [github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)
**Docs:** [ui.shadcn.com](https://ui.shadcn.com)
**Aesthetic:** Clean, minimal, accessible. The foundation everything else builds on. v4 supports Radix UI or Base UI via `--base radix` or `--base base`.

```bash
bunx shadcn@latest init --preset nova --yes
bunx shadcn@latest add button card dialog form table tabs
```

### Core Components

**Layout:** accordion, aspect-ratio, card, carousel, collapsible, resizable, scroll-area, separator, sheet, sidebar, tabs
**Forms:** button, calendar, checkbox, combobox, command, date-picker, form, input, input-otp, label, radio-group, select, slider, switch, textarea, toggle, toggle-group
**Feedback:** alert, alert-dialog, badge, dialog, drawer, hover-card, popover, progress, skeleton, sonner (toast), tooltip
**Data:** avatar, data-table, pagination, table
**Navigation:** breadcrumb, context-menu, dropdown-menu, menubar, navigation-menu

---

## Registry Pattern

All shadcn-compatible registries follow the same CLI pattern:

```bash
# Official shadcn components (no URL needed)
npx shadcn@latest add button

# Third-party registries (full URL to JSON)
npx shadcn@latest add "https://spell.sh/r/blur-reveal.json"
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
```

Components are copied into your project — you own the code. No lock-in.

## shadcn CLI v4 Registry Features

### Registry Management
```bash
# Add a namespaced third-party registry
bunx shadcn@latest registry add @acme=https://acme.com/r

# Search/browse registry items
bunx shadcn@latest search @shadcn

# Install from namespaced registry
bunx shadcn@latest add @acme/hero-section
```

### Safety Flags (v4)
```bash
# Preview what will change before installing
bunx shadcn@latest add button card --dry-run

# See exact file diffs
bunx shadcn@latest add dialog --dry-run --diff

# View file contents without writing
bunx shadcn@latest add form --view
```

### Component Docs
```bash
# Get docs and examples for a component
bunx shadcn@latest docs button
bunx shadcn@latest docs button --json  # LLM-friendly output
```

## Quality Bar

When choosing components from any registry:

1. **Does it respect theme variables?** (uses `--background`, `--foreground`, etc.)
2. **Does it handle dark mode?** (not hardcoded colors)
3. **Is it accessible?** (keyboard nav, ARIA, focus management)
4. **Is the animation tasteful?** (not gratuitous — enhances, doesn't distract)
5. **Does it use motion/react or CSS?** (avoid heavy runtime deps for simple effects)
