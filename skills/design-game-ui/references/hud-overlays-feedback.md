# HUD, Overlays, Back, and Feedback

Design the HUD as an attention budget. Persistent information competes with the user's primary content; overlays compete with both content and navigation.

## Information hierarchy

Classify every HUD element:

- **Persistent:** essential status that changes frequently and must remain glanceable.
- **Contextual:** appears while relevant, then withdraws.
- **Transient:** acknowledges an event for a bounded time.
- **On demand:** available through a menu, details action, or expanded HUD.

Promote information only when missing it would harm the current task. Move low-frequency metadata out of the persistent layer.

## HUD specification

For each module, record:

| Module | Class | Trigger | Priority | Safe anchor | Occlusion risk | Duration | User controls |
|---|---|---|---|---|---|---|---|
| objective | contextual | objective changes | high | top-left safe area | subtitles, map | until understood/completed | scale, opacity, hide completed |

Offer configuration appropriate to the product: master HUD scale, opacity, safe-area adjustment, module toggles, subtitle-safe placement, color/contrast alternatives, and reduced animation. Never allow configuration to hide a legally or operationally required warning without an alternative.

## Occlusion and collisions

Define reserved regions for subtitles, platform notifications, player labels, interactive prompts, and accessibility overlays. Resolve collisions by priority, not insertion order.

- Keep prompts near the relevant object only when they remain readable and stable.
- Avoid placing changing counters over faces, captions, aiming regions, or primary video content.
- Collapse related signals into one module rather than stacking independent toasts.
- Reflow for split-screen or shared focus if supported.

## Notification budget

Set explicit limits:

- Maximum simultaneous toasts
- Queue length and overflow behavior
- Minimum readable duration and extension for longer/localized text
- Priority/preemption rules
- Dedupe/coalescing window
- Whether focus, narration, audio, or haptics are permitted

Toasts do not take focus. Critical errors that need a decision become a modal or focused overlay. Preserve an accessible history when transient information matters after it disappears.

## Layer stack

Represent the interface as an ordered stack, for example:

`system modal → product modal → overlay → screen → shell`

Only the top interactive layer receives semantic actions. For each layer define:

| Layer | Opens from | Initial focus | Input owner | Back behavior | Close condition | Focus return |
|---|---|---|---|---|---|---|

Back should:

1. Cancel an in-progress remap or hold safely.
2. Close the top dismissible modal/overlay.
3. Return from a subordinate screen.
4. Move from content to the shell only if the product convention calls for it.
5. Request exit only at the root and with platform-appropriate behavior.

Never let Back silently confirm, purchase, save a destructive change, close multiple layers, or lose user work. If a form is dirty, offer a focused decision with a safe default.

## Settings rows

Use predictable row patterns:

- Toggle: left/right changes only if accidental edits are acceptable; otherwise Confirm opens or toggles.
- Choice: left/right cycles with visible bounds or Confirm opens a list.
- Slider: left/right adjusts; expose numeric/text value and large-step alternatives.
- Remap: Confirm enters a clearly announced listening state; Back cancels.
- Submenu: Confirm opens; Back returns to the originating row.

Separate focus from value. A focused row is not necessarily selected or changed. Announce current value, constraints, and conflict states.

## Multisensory feedback

Specify feedback for focus, activation, success, error, disabled actions, destructive actions, connection changes, and acquired rewards/status.

- **Visual:** immediate state change, not color alone.
- **Audio:** short, distinguishable cues with independent volume or disable options.
- **Haptic:** bounded patterns; avoid continuous or startling feedback; allow reduction/off.
- **Narration:** semantic name, role, value, state, position, and consequences where supported.
- **Motion:** reinforce hierarchy and direction; never delay input; honor reduced motion.

Do not require sound or haptics to understand success or failure. Prevent feedback storms during held navigation and repeated actions.

## Review checks

- Persistent HUD contains only task-critical information.
- Subtitle, focus, and safe regions do not collide.
- Notification concurrency, queueing, duration, dedupe, and history are specified.
- Every overlay defines initial focus, trap, Back, and focus return.
- Settings distinguish focus from value changes and support cancel.
- Important state changes have redundant, configurable feedback.
