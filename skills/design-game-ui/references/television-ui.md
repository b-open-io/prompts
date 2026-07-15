# Television and Ten-Foot UI

Design for a person several feet from a shared display using a low-bandwidth directional device. A desktop layout enlarged with CSS is not a television interface.

## Establish the target envelope

Record:

- Platforms and OS versions
- 720p, 1080p, 4K, ultrawide, or dynamic-resolution output
- Expected viewing distance and television sizes
- D-pad remotes, gamepads, keyboards, and pointer-capable remotes
- Lowest supported CPU/GPU/memory tier
- Overscan behavior and platform safe-area requirements
- Shared-room privacy and multiple-user behavior

Use platform-specific guidance when it is stricter. Android TV expects D-pad reachability and predictable navigation. Fire TV guidance describes a conservative inner safe region and large readable type. tvOS has its own focus and remote conventions. Do not force one platform's button labels or Back behavior onto another.

## Safe area contract

Define two rectangles:

1. **Critical safe area** — all text, focus targets, prompts, controls, progress, and required status stay inside it.
2. **Decorative bleed** — backgrounds and nonessential imagery may extend to display edges.

When a platform lacks a stronger rule, a conservative starting point is to keep critical UI within the inner 90% of each dimension, then validate on real televisions. Express the inset as tokens and test it rather than embedding magic margins throughout components.

Account for focus scale and glow: an item inside the layout safe area can still have its focus treatment clipped at the edge.

## Type, contrast, and density

- Test all copy at couch distance on the smallest supported display.
- Use larger type and more generous line height than a desktop counterpart; Fire TV's guidance treats roughly 28 px at 1080p as a minimum starting point for readable body text.
- Prefer short, direct labels and one primary goal per screen.
- Limit simultaneous columns, badges, counters, and metadata.
- Avoid large blocks of centered prose.
- Preserve strong contrast without using extreme saturation over large areas.
- Keep text off busy imagery or use stable scrims.
- Support text scaling without clipping, overlap, or loss of actions.

Do not encode meaning through color alone. Focused, selected, watched, locked, and disabled states need distinct shape, icon, label, or pattern cues.

## Navigation and layout

- Make every interactive item reachable by D-pad.
- Keep directional outcomes visually predictable.
- Align tiles and rows to create clear movement lanes.
- Show enough adjacent content to communicate scroll direction.
- Avoid hover-dependent controls and tiny icon-only actions.
- Keep essential actions visible or reveal them consistently on focus with supporting text.
- Minimize deep hierarchy; Back should unwind one understandable step.

Carousels need explicit boundary behavior. Decide whether the row stops, wraps, pages, or hands focus to another container; never let it vary by content count.

## Performance budget

Navigation latency is a usability feature. Budget for the lowest target hardware:

- Keep focus movement on the fast path; do not wait for network or large rerenders.
- Precompute or incrementally maintain focus metadata.
- Virtualize carefully while preserving stable focus IDs.
- Decode and size images near their rendered dimensions.
- Avoid full-screen blur, excessive transparency, unbounded shadows, and particle effects on constrained devices.
- Bound simultaneous animations and notifications.
- Measure input-to-visible-focus latency, frame drops, memory, startup, and screen-transition time.

Provide reduced-motion and low-effects modes when the presentation is expensive or intense. Maintain readable focus without animation.

## Communal privacy

Televisions are often shared and visible across a room. Decide whether to mask, defer, or move to a companion device:

- Account identifiers and contact details
- Wallet balances and purchase history
- Private messages and notifications
- Search/history recommendations
- Authentication and payment entry

Require explicit confirmation for purchases and account switching. Make the active profile unmistakable. Do not show sensitive notification content on a shared display by default.

## Device review checklist

- Critical UI remains inside safe area at all supported resolutions.
- Focus treatment never clips at edges.
- Body text, prompts, and errors are readable at couch distance.
- D-pad reaches every critical action without pointer or touch.
- Back/Home behavior follows platform convention.
- The lowest hardware tier meets navigation and rendering budgets.
- Shared-display privacy, profile, authentication, and purchase states are reviewed.
- Device switching, sleep/resume, and remote disconnect recover cleanly.

## Primary platform guidance

- [Android TV: Navigation on TV](https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv)
- [Android TV: Focus system](https://developer.android.com/design/ui/tv/guides/styles/focus-system)
- [Android TV: Layouts](https://developer.android.com/design/ui/tv/guides/styles/layouts)
- [Amazon Fire TV design and UX guidelines](https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html)
- [Apple: Designing for tvOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos)
