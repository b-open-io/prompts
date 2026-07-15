---
name: design-game-ui
version: 0.0.2
description: >-
  This skill should be used when the user asks for "game UI", "app-to-game UI",
  "video game HUD", "controller navigation", "D-pad navigation", "TV app",
  "ten-foot interface", "game UI key bindings", "controller-first menu",
  "console-style menu", "TV remote focus", or "directional navigation".
---

# Design Game UI

Turn existing product content into a controller- or remote-first interface without losing the routes, state, actions, accessibility, or operational behavior that already make the app useful.

Treat game UI as an interaction architecture, not a visual reskin. Establish the action model, focus graph, layer stack, safe area, feedback, and test matrix before decorating the shell.

Route in-world 3D, world-space, and diegetic interface work to a 3D design
workflow. Route gameplay movement, combat, camera, and vehicle control schemes
to gameplay/input-system engineering unless the task also includes menus or HUD.

## Non-negotiable invariants

- Define semantic actions independently from keyboard keys, controller buttons, and remote events.
- Make every critical path completable with digital directional input and one action at a time.
- Keep focus visible, deterministic, recoverable, and inside the active layer.
- Preserve existing route, state, permission, and data owners unless the task explicitly replaces them.
- Make Back predictable and non-destructive; process it against an explicit layer stack.
- Keep critical television UI inside the selected safe area and test it at couch distance.
- Pair important state changes with redundant visual and, where appropriate, audio, haptic, or narrated feedback.
- Never make sound, haptics, motion, or color the only way to understand an action or state.
- Validate on representative target devices and constrained hardware, not only in a desktop browser.

## Start with an interface inventory

Inspect the running product and its source before proposing a shell. Record:

1. Routes, dialogs, drawers, tabs, lists, forms, media, and persistent controls.
2. The state owner and side effects behind every primary action.
3. Pointer-only behaviors such as hover menus, drag gestures, context menus, tooltips, and scroll-wheel dependencies.
4. Existing keyboard shortcuts, accessibility semantics, analytics, permissions, destructive flows, and error recovery.
5. Target platforms, input devices, rendering constraints, viewing distance, localization, and multiplayer or shared-screen needs.

Read `references/app-conversion.md` for the migration procedure and the bOpen.AI-style shell pattern.

## Classify the surfaces

Assign every surface one role before arranging it:

| Role | Purpose | Typical examples |
|---|---|---|
| Shell | Global identity and navigation | rail, status strip, profile, global actions |
| Screen | One primary task or content collection | library, store, dashboard, mission list |
| HUD | Persistent or contextual status around live content | health, balance, objective, media progress |
| Overlay | Temporary focused task above a screen | inventory, quick settings, details, pause |
| Modal | Blocking decision requiring explicit resolution | confirmation, permission, critical error |
| Toast | Time-bound acknowledgement that never steals focus | saved, connected, reward received |

Do not flatten all content into a HUD. Keep primary work in screens, time-sensitive status in the HUD, and temporary tasks in overlays.

## Build the interaction architecture

Work in this order:

1. **Action map** — Define `navigate`, `confirm`, `back`, `menu`, paging, tabbing, and product-specific actions. Then bind each supported device. Read `references/input-action-map.md`.
2. **Focus graph** — Define containers, directional neighbors, entry targets, remembered focus, scroll coupling, disabled-item behavior, and recovery. Read `references/focus-navigation.md`.
3. **Layer stack** — Define which layer owns input and focus, and what Back does at every depth. Read `references/hud-overlays-feedback.md`.
4. **Ten-foot constraints** — Choose safe-area policy, scale, density, contrast, performance budget, and privacy behavior. Read `references/television-ui.md` for television or couch-distance targets.
5. **Feedback and HUD** — Budget persistent information, contextual prompts, transient messages, audio, haptics, narration, and motion.
6. **Inclusive paths** — Specify remapping, digital alternatives, text scaling, captions, color-independent cues, reduced motion, narration, localization, and RTL. Read `references/accessibility-localization.md`.
7. **Proof** — Create a device matrix, focus traversal fixtures, performance budgets, onboarding checks, and telemetry plan. Read `references/validation-telemetry.md`.

## Compose companion capabilities

Keep this skill responsible for the interaction contract, then bring in only
the capabilities required to produce or prove the requested result. Read
`references/collaboration-and-companion-skills.md` before assigning work.

The most common companion is `Skill(bopen-tools:ui-audio-theme)`. Invoke it
when the user wants actual focus, activation, success, error, modal, or
notification sounds rather than only an audio-event specification. Have
**Frames** (`audio-specialist`) generate, audition, normalize, and integrate the
sound set through its visual sound picker so the user can hear alternatives,
regenerate a slot, and explicitly accept each result. Keep semantic event
meaning, repeat suppression, accessibility, volume/off behavior, and acceptance
criteria in the game-UI contract. Do not duplicate audio generation or picker
logic in this skill.

Use the same bounded handoff pattern for Lisa and Gemskills visual assets,
Kris's 3D or diegetic UI, Theo's application integration, Torque's constrained
hardware performance work, and Jason's traversal and device testing. Do not
dispatch every collaborator by default.

## Convert pointer behavior deliberately

Never map hover directly to focus without checking its meaning. Convert each pointer behavior explicitly:

- Hover preview → focus preview only when preview is safe and reversible.
- Click → `confirm`; double-click → a separate semantic action or remove it.
- Right-click/context menu → `menu` or a visible secondary action.
- Wheel scrolling → directional navigation, paging, or analog scroll with digital fallback.
- Drag and drop → select, move, confirm, and cancel steps.
- Off-canvas dismissal → Back; never require clicking outside an overlay.
- Tooltip → focus help, a details action, or persistent supporting text.

Keep pointer input as an optional parallel path when the platform supports it. Switching devices must not strand focus or change product meaning.

## Produce the design contract

Before implementation, return one cohesive contract containing all of the following:

1. **Scope and assumptions** — target platforms, devices, viewing distance, performance tier, accessibility and localization requirements.
2. **Capability and ownership map** — needed lane, trigger, lead, companion skill or agent, input contract, deliverable, acceptance owner, and omitted lanes with reasons.
3. **Content-preservation map** — existing route/surface/action/state owner → proposed shell/screen/HUD/overlay placement; flag anything removed or behaviorally changed.
4. **Semantic action table** — action, purpose, availability, keyboard binding, controller binding, remote binding, hold/repeat behavior, rebinding policy, and visible glyph.
5. **Focus specification** — focus containers and entry points, directional rules or explicit neighbors, wrap policy, scroll behavior, memory, recovery, disabled states, and pointer-to-focus handoff.
6. **Layer and Back table** — ordered layers, input owner, focus trap, opening focus, close condition, Back result, and focus return target.
7. **Screen and HUD plan** — safe area, hierarchy, visibility states, occlusion risks, notification queue budget, configurable modules, scale and opacity options.
8. **Feedback specification** — focus, activation, error, success, connection, and destructive-event treatments across visuals, sound, haptics, narration, and reduced-motion mode. If sounds are produced, include stable event IDs and asset acceptance criteria.
9. **Implementation phases** — shared input/focus foundation first, then shell, migrated screens, settings and overlays, polish, and platform hardening. Name existing state owners to preserve.
10. **Validation matrix** — device × resolution × locale × accessibility mode × flow, with acceptance criteria and performance targets.
11. **Telemetry and iteration plan** — navigation failures, abandoned flows, remaps, Back loops, focus recoveries, latency, onboarding completion, and privacy-safe review cadence.

If the user requested code, implement against this contract in vertical slices. Prove controller-only completion for each slice before migrating the next screen.

## Keep platform rules explicit

Use platform conventions as constraints, not as interchangeable decoration. Record where tvOS, Android TV, Fire TV, Xbox, PlayStation, web, or desktop behaviors diverge. W3C Spatial Navigation is a useful vocabulary and experimental baseline, not a guarantee of identical browser behavior; validate the actual runtime and provide deterministic overrides.

## References

- `references/app-conversion.md` — audit and migrate an existing app without losing behavior.
- `references/input-action-map.md` — semantic actions, device bindings, remapping, repeat, deadzones, disconnects, and glyphs.
- `references/focus-navigation.md` — deterministic spatial navigation, overrides, memory, scrolling, and recovery.
- `references/television-ui.md` — ten-foot layout, safe areas, typography, density, performance, and communal privacy.
- `references/hud-overlays-feedback.md` — HUD budgets, overlay layers, Back, notification queues, motion, audio, and haptics.
- `references/accessibility-localization.md` — accessible input, narration, captions, color, motion, RTL, and text expansion.
- `references/validation-telemetry.md` — device matrix, fixtures, onboarding, performance, analytics, and release gates.
- `references/collaboration-and-companion-skills.md` — bounded handoffs to audio, visual, 3D, implementation, performance, and testing capabilities.
