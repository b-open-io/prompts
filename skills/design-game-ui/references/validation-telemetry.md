# Validation, Onboarding, and Telemetry

Prove the interaction model with fixtures and hardware. Visual snapshots alone cannot validate focus, Back, device lifecycle, narration, or input latency.

## Build a coverage matrix

Create rows for critical flows and columns for the meaningful combinations:

| Flow | Device | Platform | Resolution | Locale/direction | Accessibility mode | Network/state | Expected completion |
|---|---|---|---|---|---|---|---|

Choose representative pairwise combinations for routine CI and reserve the full matrix for release qualification. Always include the weakest directional device and lowest performance tier.

## Automated fixtures

Test semantic behavior below presentation:

- Physical events normalize to the expected semantic actions.
- Deadzone, release thresholds, repeat delay/cadence, long-press cancellation, and chords behave deterministically.
- Remap conflict, persistence, reset, and recovery work.
- Every focus fixture produces the expected next stable focus ID.
- Opening a layer chooses its initial focus and Back restores the correct target.
- Removing or disabling the focused item invokes the recovery chain.
- Pointer/controller switching preserves a usable directional target.
- Localization expansion, text scaling, RTL, and resizing do not create unreachable controls.
- Disconnect clears held state and replacement devices resume safely.

Keep golden focus graphs or compact traversal fixtures for irregular screens. Add a regression fixture for every focus escape, wrong jump, Back loop, or clipped target found in production.

## End-to-end paths

Run controller-only or remote-only tests for:

- First launch and onboarding
- Sign-in/profile selection
- Global navigation and search
- The product's primary task
- Settings and remapping
- Error, offline, permission, and recovery paths
- Purchase or destructive confirmation where applicable
- Suspend/resume and reconnect
- Exit/root Back behavior

Disable or physically avoid pointer input during these passes. Record the action sequence using semantic names so it can replay across device families.

## Performance gates

Measure on target hardware:

- Raw input to visible focus response
- Frame time and dropped frames during navigation
- Screen and overlay open time
- Startup and resume time
- Image decode and memory pressure
- Focus graph update cost for long/virtualized lists
- Notification/animation worst case

Set numeric budgets with the project team. A focus move must never wait for network data. Use immediate local feedback, then reconcile asynchronous state.

## Onboarding

Teach by doing:

1. Detect or let the user select the active device family.
2. Introduce Confirm and Back in a reversible interaction.
3. Reveal advanced actions only when first relevant.
4. Keep a controls reference reachable from pause/settings.
5. Reflect remaps and current glyph family in every instruction.
6. Allow onboarding to be skipped, replayed, and narrated.

Do not front-load a wall of controller diagrams. Validate that a first-time user can recover after pressing the wrong action.

## Privacy-safe telemetry

Measure friction, not private content. Useful events include:

- Semantic action and screen/container ID, sampled or aggregated
- Focus recovery invoked and reason
- Directional action with no candidate
- Repeated Back on the same layer or Back loops
- Abandoned flow step
- Remap started/completed/conflicted/reset
- Device family switch and disconnect recovery
- Input-to-focus latency and dropped-frame bucket
- Onboarding completion or replay
- Accessibility and HUD settings only when collection is consented and aggregated appropriately

Do not capture raw typed text, private messages, account data, precise media history, controller serials, or unnecessary physical key streams. Follow product consent, retention, and regional privacy requirements.

## Review cadence

After release:

1. Review no-candidate actions and focus recoveries by screen.
2. Reproduce high-frequency failures on the reported device class.
3. Watch Back loops and abandonment before changing visual polish.
4. Compare latency and completion across input families without treating accessibility use as a defect.
5. Add a fixture, fix the semantic architecture, and verify on hardware.

Combine analytics with moderated couch-distance usability sessions. Telemetry shows where friction occurs; observation explains why.

## Release gate

- Content-preservation map has no unexplained missing critical actions.
- Controller-only and weakest-remote critical flows pass.
- Focus traversal, layer restoration, remapping, and device lifecycle fixtures pass.
- Largest text, RTL, reduced motion, captions, narration, and non-color cues are reviewed as applicable.
- Safe-area and couch-distance reviews pass at supported resolutions.
- Lowest hardware tier meets numeric latency and rendering budgets.
- Purchases, authentication, destructive actions, and shared-display privacy are reviewed.
- Telemetry is consented, minimal, documented, and paired with an iteration owner.
