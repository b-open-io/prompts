# cuelume Web Delivery

[cuelume](https://github.com/Danilaa1/cuelume) ([demo](https://cuelume-site.pages.dev/), [recipes](https://github.com/Danilaa1/cuelume/blob/main/src/sounds/recipes.ts)) synthesizes 14 UI micro-interaction sounds live with Web Audio. No files, zero runtime dependencies beyond itself, MIT-licensed, ESM-only. It is a second delivery path for this skill's web targets, alongside the ElevenLabs sample pipeline described in `sound-design-guide.md`.

## When to choose cuelume vs when to stay on ElevenLabs samples

Choose cuelume when the surface is a plain web app and the need is crisp, generic micro-interaction feedback: hover, press, release, toggle, success, error, and similar. It is deterministic (same input, same sound every time), tuned by the library author, and adds nothing to bundle size or asset pipeline — two lines of code replace an entire generate-audition-accept cycle.

Stay on ElevenLabs samples when any of the following apply:

- **The sound needs to be bespoke or branded.** cuelume's palette is fixed at 14 names. If the vibe preset calls for "warm wooden click" or "premium glass chime," cuelume cannot produce it — it plays its own synthesized `press` or `chime` regardless of vibe wording.
- **The target is ambient or voice audio.** cuelume only does short, click-triggered micro-interaction cues. It has no concept of ambient loops, ducking, or spoken feedback — that's `voice-clone` and the ElevenLabs pipeline's job.
- **The target needs a shippable audio file.** Game engines and TV/desktop apps (see `design-game-ui`) need an actual `.mp3`/`.wav` asset to import into their audio system. cuelume plays sound through the Web Audio API inside a running browser tab and never writes a file, so it has nothing to hand off to a non-browser target.
- **The event carries high-trust or wallet-specific meaning.** Transaction sent/received/confirmed sounds (see Sound Categories → Transactions in `SKILL.md`) benefit from a purpose-tuned, brand-consistent cue; cuelume's nearest matches are generic approximations. See `assets/cuelume-event-map.json` for exactly which transaction events this applies to.

In short: cuelume covers the high-frequency, low-stakes clicks that make a web UI feel responsive. ElevenLabs samples cover everything that needs to sound like *this specific product* or that needs to exist as a file.

The two paths combine within one app. A dashboard can wire cuelume for buttons, navigation, toggles, and hover states, and keep ElevenLabs-generated samples for its transaction-confirmation and branded notification sounds — the choice happens at the level of the individual event.

## Install and wiring

```bash
bun add cuelume
```

### Declarative: data attributes

Mark up interactive elements directly. Leave the attribute empty to use the sound's default, or set it to any of the 14 sound names to override:

```html
<button data-cuelume-hover data-cuelume-press>Send</button>
<button data-cuelume-press="tick" data-cuelume-release="release">Cancel</button>
<div data-cuelume-toggle="toggle" role="switch">Dark mode</div>
```

| Attribute | Fires on | Default sound |
|---|---|---|
| `data-cuelume-hover` | `pointerenter` | `chime` |
| `data-cuelume-press` | `pointerdown` | `press` |
| `data-cuelume-release` | `pointerup` | `release` |
| `data-cuelume-toggle` | `click` | `toggle` |

Wire it once, globally:

```typescript
import { bind } from "cuelume";

bind(); // idempotent, event-delegated, picks up DOM added later
```

React — call `bind()` once on mount:

```typescript
import { useEffect } from "react";
import { bind } from "cuelume";

function App() {
  useEffect(() => {
    bind();
  }, []);

  // ...
}
```

`bind()` is safe to call from a server component tree: the import is a server no-op, and `bind()` itself only does anything once it runs in a browser.

### Imperative: `play()`

For events that don't map to a DOM pointer gesture — an async success/error toast, a completed upload, a websocket notification, or a background sync finishing — call `play()` directly with any of the 14 sound names:

```typescript
import { play } from "cuelume";

async function sendTransaction() {
  try {
    await broadcast(tx);
    play("success");
  } catch {
    play("error");
  }
}
```

`play()` silently no-ops on an invalid sound name or when the browser has blocked audio (e.g., before the user's first gesture) — no try/catch needed around it.

### User sound preference

The app owns the mute/enable preference — localStorage, a user profile, or whatever mechanism it already uses for other preferences:

```typescript
import { setEnabled } from "cuelume";

setEnabled(userPrefersSound); // call on load and whenever the setting changes
```

This satisfies the "allow users to disable all sounds easily" accessibility requirement in `sound-design-guide.md` — wire `setEnabled` to the same toggle that controls any ElevenLabs-sourced sounds in the same app, so one switch controls both delivery paths.

### The 14 sound names

`chime`, `sparkle`, `droplet`, `bloom`, `whisper`, `tick`, `press`, `release`, `toggle`, `success`, `error`, `page`, `loading`, `ready`.

Import the `SoundName` type if the app wants compile-time checking on sound name strings:

```typescript
import type { SoundName } from "cuelume";
```

### Behaviors baked into the library (don't re-implement these)

- Hover cues require a fine pointer (they don't fire from touch) and are throttled to at most once per 150ms, so sweeping a cursor across a menu doesn't machine-gun sounds. This already matches the "throttle (~90ms)" hover guidance in `sound-design-guide.md` — no extra debouncing needed on the app side.
- One lazily-created `AudioContext` is shared across all calls; nothing to preload or pool.
- The import is SSR-safe — importing `cuelume` in a server-rendered component tree does nothing until `bind()`/`play()` actually run in the browser.

## Mapping onto our semantic event map

`assets/cuelume-event-map.json` maps every event in this skill's Sound Categories (`SKILL.md`) onto one of cuelume's 14 sounds, with a `coverage` rating (`good` / `approximate` / `poor`) and an `elevenlabs_recommended` flag per event. Read that file before wiring a cuelume-backed theme — it tells you which events are a clean fit (most buttons, navigation, modals, feedback) and which ones remain ElevenLabs' responsibility (destructive-button danger tone, warning notifications, and most transaction events, where cuelume's nearest match is only a generic approximation).

When auditing an existing product with `scripts/audit_theme.py` per `references/audit-and-wiring.md`, an event wired to cuelume is still a valid `"decision": {"type": "sound", "sound": "<name>"}` entry in the event map — record the cuelume sound name in place of a theme filename, and note the delivery mechanism (`"delivery": "cuelume"`) in `source_evidence` so a later auditor doesn't go looking for a missing `.mp3` file.

## Tradeoff

cuelume trades customization for zero setup cost. Weigh three fixed constraints before committing an app-wide theme to it:

1. **Fixed 14-sound palette.** There is no prompt, no vibe preset, no regeneration — every app using cuelume for a given event hears the same synthesized sound. Products that need a distinctive sonic identity should use ElevenLabs samples for at least their signature moments (see the "When to choose" section above).
2. **Web-only.** cuelume plays through the browser's Web Audio API and never produces a file. Non-browser targets like game engines and TV/desktop apps stay on the ElevenLabs pipeline, which does write files.
3. **An external MIT dependency on its own release cadence.** cuelume ships from a third-party repo we don't control. Pin a version, and re-verify the 14 sound names and API surface (`bind`, `play`, `setEnabled`, `sounds`, `SoundName`) against the installed version before relying on this guide if a major version bump has landed since these facts were verified.
