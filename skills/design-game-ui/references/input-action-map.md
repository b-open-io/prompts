# Semantic Actions and Device Bindings

Build one semantic action layer, then bind devices to it. Components consume actions such as `confirm`; they do not consume `Enter`, gamepad button `0`, or an Android key code directly.

## Action map template

| Action | Meaning | Contexts | Keyboard | Controller | TV remote | Repeat/hold | Rebindable | Glyph token |
|---|---|---|---|---|---|---|---|---|
| `navigate.up` | Move focus up | navigation | ArrowUp / W | D-pad up / stick | D-pad up | repeat | yes | `nav-up` |
| `confirm` | Activate focused item | most | Enter / Space | south face button | center/select | edge only | yes | `confirm` |
| `back` | Close one layer or navigate back | most | Escape | east face button | Back | edge only | yes, protected | `back` |
| `menu` | Open contextual/global menu | allowed screens | chosen key | menu button | menu key if present | edge only | yes | `menu` |

Add paging, tabbing, bumpers, triggers, zoom, camera, media, or product-specific actions only when the task needs them. Do not force users to remember an unlabeled chord for a critical path.

## Processing pipeline

Normalize input in this order:

1. Read raw events from connected devices.
2. Identify device family and capability without assuming button indices are universal.
3. Apply calibration, deadzone, and axis normalization.
4. Resolve the physical binding to a semantic action in the active context.
5. Apply edge, repeat, long-press, or chord policy.
6. Route the action to the top active layer.
7. Emit feedback and telemetry without logging sensitive user data.

Keep action state independent per device so a stuck axis on one gamepad does not block remote or keyboard control.

## Analog and digital navigation

- Provide a digital alternative for every analog-only interaction.
- Use configurable deadzones; account for both axial and radial stick behavior when relevant.
- Require the axis to return through a release threshold before a fresh edge event.
- Start directional repeat after a deliberate delay, then use a bounded cadence. If acceleration is used for long lists, keep single-step control predictable.
- Debounce remote key repeats separately; consumer hardware varies widely.
- Do not let diagonals generate unstable alternating directions. Resolve them consistently or prefer the dominant axis.

Document actual values as product tokens, for example `stickEnterThreshold`, `stickExitThreshold`, `repeatDelayMs`, and `repeatIntervalMs`, then tune on hardware.

## Long press and chords

Use long press for optional acceleration or secondary actions, never as the only path to a critical action. Show progress or an immediate state cue during a hold. Cancel cleanly on release, focus change, layer change, and disconnect.

Avoid simultaneous-button requirements. When a chord is retained for experts, provide a sequential, menu-based, or remappable alternative and show the chord in context.

## Remapping contract

Support the following where the platform allows custom bindings:

- Every gameplay and interface action can be remapped, including navigation and menu access.
- Protected actions cannot be removed without a reachable recovery path.
- Conflicts are detected before save and resolved explicitly.
- Labels and glyph prompts update immediately everywhere.
- Profiles persist per user and, when appropriate, per device family.
- Reset restores a documented default scheme.
- Import, cloud sync, or device replacement cannot silently create an unusable map.

Always provide a way to recover from an inaccessible mapping, such as a startup reset gesture with a menu alternative or an OS-level reset.

## Device lifecycle

Define behavior for:

- Connection and disconnection mid-action
- Controller reassignment and multiple users
- Battery warnings
- Loss of the active remote
- Resuming from sleep
- Switching from controller to keyboard/pointer and back
- Devices with missing buttons, touchpads, paddles, or vendor-specific layouts

On disconnect, pause risky live interactions when appropriate, clear held states, announce the change, and accept a supported replacement device without restarting the flow.

## Dynamic glyphs

Render prompts from semantic glyph tokens plus active device family. Never hard-code a letter such as “A” into product copy. Keep a text fallback for unknown devices and narration.

Update glyphs on meaningful input-device changes, but avoid flickering when analog drift causes false switching. Preserve the user's chosen glyph family if they explicitly override detection.

## Acceptance checks

- Components import semantic actions, not physical codes.
- Controller-only and remote-only critical paths pass.
- Digital alternatives exist for analog operations.
- Repeat, deadzone, long-press cancellation, and disconnect behavior are tested.
- Remap conflicts, persistence, reset, and recovery are tested.
- Every visible binding label updates after remapping and device switching.

## Primary guidance

- [Xbox Accessibility Guideline 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) — digital alternatives, remapping, simultaneous-input alternatives, and updated labels.
- [Xbox Accessibility Guideline 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) — navigation access and focus expectations.
