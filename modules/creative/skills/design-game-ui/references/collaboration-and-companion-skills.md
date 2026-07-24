# Collaboration and Companion Skills

`design-game-ui` leads interaction architecture. It owns the content-preservation
map, semantic actions, focus graph, layer and Back behavior, HUD budget,
multisensory event meanings, and acceptance criteria. Companion capabilities
produce or validate specialized parts of that contract; they do not silently
redefine it.

There is one UI-sound production workflow: `ui-audio-theme`. This reference
defines its input and acceptance boundary; it does not replicate the generator,
presets, visual picker, normalization, or asset registry. `voice-clone` is a
separate spoken-voice workflow and is not an alternative UI-sound generator.

## Select only the necessary lanes

| Need | Trigger | Companion | Deliverable back to Ridd |
|---|---|---|---|
| UI sound assets | The user wants actual navigation, action, state, modal, or notification sounds | `Skill(bopen-tools:ui-audio-theme)` with **Frames** (`audio-specialist`) | Auditioned, normalized assets plus event-to-file manifest and integration notes |
| Illustrations, icons, textures, or visual mockups | The interface needs new visual assets rather than layout direction alone | **Lisa** with `gemskills:generate-image`, `gemskills:generate-svg`, or `gemskills:generate-icon` | Approved assets, prompts/provenance, sizes, states, and usage constraints |
| World-space or diegetic interface | UI is attached to the game world, camera, 3D object, or shader pipeline | **Kris** (`creative-developer`) with `threejs-r3f` or `shaders` | 3D implementation plan or components that honor the action, focus, legibility, and fallback contract |
| React/Next.js application integration | Routing, server/client boundaries, data ownership, or framework structure dominates the work | **Theo** (`nextjs`) | Integrated vertical slice preserving state owners, routes, and semantic input boundaries |
| Constrained-device performance | The target includes low-end television, console browser, embedded GPU, or strict input-latency budgets | **Torque** (`optimizer`) with `frontend-performance` or `bopen-tools:perf-audit` | Measurements, bottleneck findings, fixes, and before/after budget results |
| Traversal and device validation | Controller/remote behavior, Back, focus recovery, accessibility, or platform combinations need proof | **Jason** (`tester`) with `agent-browser` or `chrome-cdp` where applicable | Reproducible action traces, matrix results, regressions, and release-gate evidence |
| Current platform research | Existing references do not answer a volatile or platform-specific navigation, certification, or accessibility question | **Parker** (`researcher`) with `bopen-tools:x-research` and primary platform sources | Cited findings, dated assumptions, contradictions, and recommended contract changes |

Add a lane only when its trigger is present. Record omitted lanes and the reason
when omission could otherwise look accidental. One person remains accountable
for accepting each deliverable.

## Audio handoff contract

Audio is part of interaction feedback, not decoration added after navigation is
finished. Ridd defines semantic audio events before Frames produces sounds.

Use stable event IDs such as:

| Event ID | Meaning | Repeat policy | Required non-audio cue |
|---|---|---|---|
| `ui.focus.move` | Focus reached a new enabled target | Throttle held navigation; no sound for rejected/no-op movement unless explicitly useful | Visible focus moves immediately |
| `ui.action.confirm` | A reversible action was accepted | One cue per activation edge | Pressed/activated visual state |
| `ui.action.disabled` | The focused action cannot run | Dedupe rapid repeats | Disabled treatment plus explanation when needed |
| `ui.state.success` | A requested operation completed | Coalesce duplicate completions | Persistent or readable success state |
| `ui.state.error` | An operation failed or needs attention | Do not create an alarm storm | Error message/icon and recoverable focus target |
| `ui.layer.open` | A meaningful overlay or modal opened | Do not sound routine nested transitions indiscriminately | Layer transition and announced title |
| `ui.connection.changed` | Active input or network capability changed | Dedupe flapping states | Visible status and accessible announcement |
| `ui.action.destructive` | A destructive action was confirmed | Reserve a distinct cue; never sound on focus alone | Explicit confirmation and resulting state |

For every event specify priority, context, cooldown or dedupe window, whether it
may overlap, reduced-sensory behavior, and whether narration takes precedence.
Do not key audio directly to raw key codes or gamepad button numbers.

The production handoff table must include the event ID, semantic action or
state, exact trigger edge, priority, cooldown/deduplication, overlap or
interruption rule, required visual equivalent, optional haptic/narration
equivalent, proposed audio constant and file, volume class, audio-off behavior,
semantic owner, asset owner, and runtime owner.

When actual assets are requested:

1. Pass the accepted semantic event table, product mood, target devices,
   speaker constraints, and asset format to
   `Skill(bopen-tools:ui-audio-theme)`.
2. Have Frames launch that skill's local visual sound picker by default. Give
   the user its URL so they can play candidates, edit prompts, generate another
   option for one slot, and press **Accept** for the winner. A generated
   baseline is not an approved theme.
3. Use the skill's artifact audition board only when its runtime rules call for
   it. Do not replace either audition interface with a text-only list of files.
4. Continue only after user selections are recorded. Frames returns the
   accepted event-to-file manifest, prompts/provenance, formats, and loudness
   results; do not scatter file paths through UI components.
5. The runtime owner integrates through the semantic feedback layer, including
   preload/unlock behavior, autoplay policy, repeat throttling, overlap limits,
   and independent UI-sound volume/off controls.
6. Jason verifies event firing and perceptibility on representative hardware,
   including the complete sound-off path.

Do not force a new event into an unrelated existing audio constant. Extend the
registry deliberately when `focus.move`, `focus.boundary`, or another meaning
needs a distinct asset and firing policy.

Music, voice, narration, and cinematic sound design remain Frames's production
lane, but narration semantics and accessible names still originate in the
interaction contract.

Audio ownership stays explicit:

- Ridd owns event meaning, trigger semantics, necessity, redundant cues,
  accessibility, and feedback-storm prevention.
- Frames owns sonic direction, candidates, auditioning, normalization, formats,
  and accepted asset provenance.
- Theo or the active implementation owner owns preload/unlock behavior,
  autoplay constraints, runtime bindings, rate limiting, and lifecycle.
- Jason owns automated event-firing checks and manual audibility and
  perceptibility evidence on representative hardware.

If game/television work exposes a reusable missing event slot, preset, picker
behavior, or integration rule, Frames updates `ui-audio-theme` and its own
tests/documentation. Do not grow a second audio-production implementation
inside `design-game-ui`.

## Visual asset handoff

Give Lisa or a Gemskills image workflow a bounded brief containing canvas size,
safe areas, palette and brand tokens, visual states, legibility distance,
transparency requirements, export formats, and prohibited text or iconography.
Require provenance and prompt recording where the repository maintains it.

Generated images must not bake dynamic labels, controller glyphs, prices,
localized copy, focus rings, or state that belongs in code. Ridd reviews the
asset in context at target distance and with the critical safe area visible.

## Implementation and 3D boundaries

- Ridd owns two-dimensional shell, screen, HUD, overlay, action, and focus
  behavior.
- Kris owns world-space, camera-attached, object-attached, shader-driven, and
  diegetic implementation. Ridd still supplies the input and accessibility
  fallback contract.
- Theo owns framework-heavy integration. Domain state and side effects remain
  with their existing application owners.
- If a native platform adapter is required, bring in that platform's engineer;
  keep physical key or controller APIs behind the semantic action layer.

## Verification handoff

Give Torque numeric budgets and representative low-end hardware. Give Jason
semantic action traces, stable focus IDs, expected Back results, device and
locale combinations, and accessibility modes. Neither lane should have to infer
the product's intended navigation from pixels.

Use Parker and `bopen-tools:x-research` only when guidance is missing or likely
to have changed. Prefer current primary platform documentation for final
requirements; use X discussions as practitioner evidence, not certification
authority.

Specialists return evidence against the shared contract. Ridd reconciles any
conflict and updates the contract before additional implementation proceeds.
