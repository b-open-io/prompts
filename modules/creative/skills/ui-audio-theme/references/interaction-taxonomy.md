# Interaction Taxonomy

A named vocabulary of UI sound *moments* and the restraint rules that keep
them from becoming noise. Use this reference when building or auditing an
event map (`assets/event-map-template.json`) so every semantic event picks a
sound character on purpose instead of reusing whatever clip is closest.

This taxonomy is production-agnostic: it describes what a moment *means*
and how it must *behave*. The clip behind `chime` can come from this
skill's ElevenLabs generation pipeline, a vendored library like cuelume, or
a future native synth — the semantics and the wiring requirements below
apply identically regardless of source.

For frequency/loudness curves, prompt engineering, and platform-specific
implementation (Howler.js, React hooks, preloading), see
`sound-design-guide.md`. This file sits one layer up: it names moments
before you reach for prompts.

## The 14-moment vocabulary

Fourteen named moments cover almost every UI sound need, each with a
distinct sonic character by design. Treat the "what it signals" column as
the brief you'd hand a sound designer for that moment specifically.

| Moment | What it signals | When it fires | Our nearest category/constant |
|---|---|---|---|
| `chime` | A soft, welcoming acknowledgment — the default "something is hoverable/selectable here" | Default hover on any interactive element with no more specific moment assigned | `item-hover` |
| `sparkle` | A playful, decorative accent — delight, not confirmation | Achievement unlocks, easter eggs, rare positive surprises, gamified accents | No direct constant today; closest is a lighter variant of `notification-success` for playful contexts |
| `droplet` | A single note gliding down — something is leaving or collapsing | Dismiss, collapse, close-without-consequence | `dropdown-close`, `nav-menu-close`, `modal-close` (when closing carries no state loss) |
| `bloom` | A warm, slow swell — something is opening or growing into view | Reveal, expand, first paint of new content | `dropdown-open`, `nav-menu-open`, `modal-open` |
| `whisper` | A breathy, quiet swell — presence without demanding attention | Dense lists, table row hover, secondary/background hover in content-heavy views | Sub-variant of `item-hover` for high-repetition/dense-list contexts |
| `tick` | A crisp, instant, near-inaudible tick — pure wayfinding | Nav/menu item hover, keyboard focus movement, tab-key traversal | `nav-item-hover` |
| `press` | A dull, muted knock — physical weight going down | Pointer DOWN (pointerdown) on any pressable control | Not separately named today; currently folded into `button-click-*` — see "distinct shape" below |
| `release` | A brighter, springy tick — physical weight coming back up, action commits | Pointer UP (pointerup) on the same control, action confirmed | Not separately named today; currently folded into `button-click-*` |
| `toggle` | A mechanical click-clack — a binary state actually flipped | Switches, checkboxes, tabs, segmented controls | `toggle-on`, `toggle-off`, `checkbox-check`, `checkbox-uncheck` |
| `success` | A warm, three-note confirmation — the thing you asked for happened | After an action succeeds (not on the click that requested it) | `notification-success`, `tx-sent`, `tx-confirmed` |
| `error` | A soft knock plus a descending refusal — something didn't happen, and it's recoverable | Validation failures, recoverable request errors | `notification-error` |
| `page` | A papery flick plus a glass tick — one unit of content replaced another in a sequence | Pagination, image galleries, carousels, wizard steps | `nav-forward` / `nav-back` when used for paged content specifically |
| `loading` | An unresolved, rising shimmer — work has started, outcome unknown | The moment async work begins (not the moment it resolves) | `loading-start` |
| `ready` | A focus tick plus harmonic bloom — content finished loading and is now usable | Async work resolves into rendered, interactive content | `loading-complete` |

Two moments here — `press` and `release` — do not have their own constants
in this skill's current Sound Categories. Treat that as a known gap: don't
close it by folding both into `button-click-primary`. See "Distinct shape
per moment" below for what collapsing them costs.

## Distinct shape per moment

> "Each sound in the collection has its own distinct shape... rather than a
> volume/EQ tweak on the same click." — cuelume

This is the single most important discipline in this document. A sound
theme with fourteen moments that are all the same click pitched fourteen
different ways will *measure* as fourteen files and *feel* as one sound.
Distinctness is what lets a user's ear parse which of the fourteen things
just happened without looking at the screen — that's the entire value of
naming moments in the first place.

**Rule for the generator (any production method):** before generating or
accepting a clip for a named moment, ask whether it is a genuinely different
*shape* from its neighbors — a different envelope, spectral character, or
duration, not the same clip run through a pitch or gain adjustment:

- **`press` vs `release`** — press is the sound of weight landing (short,
  dull, low, attack-first, no tail). Release is the sound of tension letting
  go (brighter, slightly longer, a small upward lift in pitch or harmonics).
  If you generate `release` by just pitching `press` up, you've made one
  sound with two volumes — reject it and regenerate with a genuinely
  different envelope and spectral character.
- **`toggle` vs `tick`** — toggle is mechanical and has two audible parts
  (a click and a clack, or an on-transient and an off-transient) because it
  represents a state flip with weight. `tick` is a single instantaneous
  grain with no mechanical character, because it represents a passing
  glance across the screen.
- **`chime` vs `bloom`** — chime is fast (two notes, done in well under a
  second) because hover happens constantly and must resolve quickly. Bloom
  is slow and has a real swell/attack curve, because it marks a state that
  persists — something has just opened and is staying open.
- **`success` vs `sparkle`** — success is a resolved, three-note cadence
  that reads as "confirmed, complete." Sparkle is unresolved and playful
  (higher, shorter, more notes, no sense of harmonic landing) because it
  marks delight. Using `success` for a decorative accent makes minor
  moments feel like major confirmations, and the reverse trains users to
  under-trust real confirmations.

When you generate a UI sound theme (via `scripts/generate_theme.py` or any
other production path) and two moments end up audibly close, either
differentiate the prompt/synthesis parameters until they are shape-distinct
or intentionally document that one moment is deferred to a shared
placeholder and flag it for revision. Never accept "close enough" silently
and call it final.

## Restraint defaults ("defaults that behave")

How rarely and how correctly a sound fires matters as much as the sound
itself — cuelume's restraint defaults are half of why the library feels
good, and they transfer independently of which synthesis method produced
the clips.

These are requirements for **any wiring layer** this skill helps produce or
audit, regardless of whether the underlying clips came from ElevenLabs
generation, a vendored library, or a future synth. Verify each one with
browser evidence, the same way `references/audit-and-wiring.md` requires
evidence for every interaction in the audit workflow.

### 1. Pointer-type gating

`chime` (hover), `press`, and `release` require a **fine pointer** (mouse,
trackpad, stylus) — skip them entirely on touch input. A touch tap has no
separate down/up moment a user perceives as distinct, and there is no
"hover" on a touchscreen at all; firing hover or press/release sounds on
touch is a bug, one that makes the interface feel like it's reacting to
phantom input.

`toggle` follows the control's native click/activation event and is fine on
**both keyboard and touch**, because a switch flipping is a discrete state
change that should sound the same regardless of input method.

**Verification:** on a touch-only device or emulated touch input, confirm
zero hover/press/release audio fires and toggle audio still fires correctly.

### 2. Hover throttle (150ms)

Global hover-sound throttle: **at most one hover sound per 150ms**, measured
across the whole page as a single budget rather than per element. Sweeping
the pointer across a dense menu or list must stay quiet even though the
cursor crosses many hoverable items in that window.

This skill's existing guidance in SKILL.md documents a narrower ~90ms
per-target throttle for `nav-item-hover`/`item-hover`. Treat 150ms as the
outer bound for *any* hover-family moment (`chime`, `tick`, `whisper`) when
wiring a new surface; tighten it per-target only when you have evidence
(per the audit workflow) that a faster throttle is still perceptually quiet
on that specific surface.

**Verification:** rapidly sweep the pointer across 10+ hoverable items in
under a second; confirm no more than ~6-7 discrete hover sounds fire (one
per ~150ms), not one per item entered.

### 3. Press/release as a genuine pair

`press` and `release` are **two separate sound-emitting moments**, each
bound to its own DOM event — treat them as one event with two names and the
pairing collapses:

- `press` fires on `pointerdown`.
- `release` fires on `pointerup`, and *only* if the pointer is still over
  the original target (a drag-off-and-release should not fire `release`,
  the same way it shouldn't fire a click).

This is the sound equivalent of a physical key: you hear it bottom out, and
you hear it come back. Wiring only one of the two (usually just a single
"click" sound on the resolved click event) collapses two distinct physical
sensations into one, which is exactly the kind of "click event with a
volume knob" flattening this taxonomy exists to prevent.

**Verification:** press and hold on a button without releasing — confirm
only `press` fires. Release while still over the button — confirm
`release` fires. Press down, drag off the button, release — confirm
`release` does NOT fire (mirroring native click-cancellation behavior).

### 4. One shared AudioContext

Any wiring layer must lazily create and reuse **exactly one** `AudioContext`
(or equivalent) for the whole page, created on first user gesture (to
satisfy browser autoplay policy — see SKILL.md's Integration Gotchas) and
never recreated per sound or per component mount. Multiple contexts waste
resources and can hit browser-imposed context limits on some platforms.

**Verification:** grep the wiring code for `new AudioContext` or
equivalent constructor calls; there should be exactly one call site, guarded
so it only runs once.

### 5. SSR-safe

Importing the sound-wiring module must be a complete no-op on the server —
no `window`, `document`, `Audio`, or `AudioContext` reference may execute
at module-load time. Sound playback functions may be called from
server-rendered component code paths (e.g. an event handler defined during
SSR but only invoked client-side); the import itself must never throw or
have side effects outside a browser environment.

**Verification:** run the wiring module through a Node.js `require`/`import`
with no DOM shims present; it must not throw.

### 6. Silent fallback on invalid/blocked audio

An unrecognized moment name, a missing audio file, a blocked
`AudioContext` (autoplay policy, browser audio disabled, permissions), or a
failed `.play()` promise must **fail silently** — no thrown exception, no
console error spam, no visible UI break. Per this skill's own principle
(CLAUDE.md: "fail informatively and immediately" in the parent codebase, but
UI audio is explicitly the exception) audio failure must never block or
visibly disrupt the interaction it was meant to accompany. Log at debug
level if you must, never at a level a production console treats as an
error.

**Verification:** call the play function with a nonexistent moment name and
with browser audio blocked (e.g. via devtools autoplay override); confirm
the calling interaction (button click, toggle, navigation) completes
normally with no console errors and no visible failure state.

## Mapping the vocabulary onto our event-map coverage sections

`assets/event-map-template.json` organizes interactions by coverage domain
(`routes`, `overlays`, `async`, `auth`, `payment`, `blockchain`, `keyboard`,
`gamepad`). Use this table as a starting point when filling in a new event
map's `interactions` array; let evidence from the actual product override
it whenever the two disagree.

| Coverage domain | Typical moments | Notes |
|---|---|---|
| **routes** | `chime`/`tick` (nav hover), `page` (route transitions in paged/tabbed contexts) | Distinguish primary nav (`tick`, per `nav-item-hover`) from general content hover (`chime`/`whisper`) |
| **overlays** | `bloom` (open), `droplet` (close), `whisper` (dense list hover inside the overlay) | A confirmation dialog closing after a destructive action should NOT use `droplet` — that moment signals dismiss-without-consequence; use `success`/`error` instead |
| **async — pending** | `loading` | Fires once, at the start of the async operation, not repeated while waiting |
| **async — success** | `success` (or `ready` if the result is newly-usable content rather than a discrete confirmation) | Use `ready` when async work resolves into something the user now interacts with (a loaded panel, a populated list); use `success` when it resolves into a confirmation of an action already taken |
| **async — error** | `error` | Recoverable errors only — see the taxonomy's distinction between `error` (soft, recoverable) and any harder failure state your product defines separately |
| **auth** | `success` (sign-in), `error` (failed sign-in), intentional silence (per-keystroke input — see the event-map template's `auth.password-field-input` example) | Do not sonify password fields; do not use `sparkle` for sign-in success — it's a confirmation, not a delight moment |
| **payment** | `press`/`release` (submit button), `loading` (processing), `success` (charge succeeded), `error` (charge failed) | The submit click is a `press`/`release` pair; the actual payment outcome is a separate `loading`→`success`/`error` sequence — never conflate "I clicked pay" with "payment succeeded" |
| **blockchain** | `press`/`release` (sign/broadcast action), `loading` (broadcast pending), `success`/`tx-sent`-family (broadcast confirmed) | Mirrors this skill's existing `tx-*` guidance in SKILL.md: never fire success on the button click, only on the broadcast/confirmation response |
| **keyboard** | `tick` (focus movement, arrow-key menu nav), `toggle` (Space/Enter on a switch), `droplet` (Escape dismissal) | `press`/`release` do not apply to keyboard activation — Enter/Space triggers a single resolved activation, not a physical down/up pair |
| **gamepad** | `tick` (D-pad/stick focus movement), `toggle` (button activation on a toggle), `press`/`release` only if the platform genuinely exposes discrete button-down/button-up events with independent handlers | Most gamepad APIs report activation as a single event; don't force a press/release pair where the input model doesn't have one |

When a domain's `status` in the event map is `not_applicable` (as
`gamepad` is in the template), skip the corresponding moments entirely.
An unused row in that case is just information about the product, and
filling it in anyway would misrepresent what the app actually does.

## Using this taxonomy when building a new event map

1. For each interaction you inventory (per `references/audit-and-wiring.md`),
   name the *moment* first, from the 14-moment table, before picking or
   generating a specific sound constant.
2. If two interactions in your map would end up assigned the same moment
   family but have different repetition/urgency profiles (e.g. two
   different `chime`-family hovers, one on a rarely-hovered CTA and one on
   a densely-packed list), consider assigning the dense one `whisper` — the
   taxonomy's density-aware variant — so both get a clip suited to their
   actual repeat rate.
3. Verify the six restraint defaults above (pointer gating, hover throttle,
   press/release pairing, shared AudioContext, SSR-safety, silent fallback)
   with actual browser evidence, the same way `audit_theme.py` requires
   source and browser evidence for every interaction.
4. When a moment in this taxonomy doesn't yet have a corresponding sound
   constant in SKILL.md's Sound Categories (currently `press`, `release`,
   `sparkle`, `whisper`, `bloom`, `droplet`, `page`, `ready` have no 1:1
   constant), either map it onto the closest existing constant and note the
   approximation, or flag it as a candidate for a new constant — don't
   silently invent an unlisted event name in the map.
