# Accessibility and Localization

Accessible controller UI is an architecture requirement. Add alternatives at the semantic action and layout levels; do not bolt them onto physical button handlers later.

## Input accessibility

Follow these invariants:

- Every critical task works with digital directional input.
- Every action can be performed with one non-simultaneous input unless the platform itself requires otherwise.
- Analog motion has digital alternatives.
- Controls are remappable, conflicts are explained, and updated labels appear everywhere.
- Required holds, rapid repeats, and chords have alternatives.
- Timing windows can be extended, disabled, or replaced where feasible.
- Users can recover from an unusable mapping.

Support platform accessibility devices through the normal action layer. Do not identify capability solely by a controller model name.

Xbox Accessibility Guidelines 107 and 112 are useful, concrete reviews for input and UI navigation even outside Xbox. Also apply the target platform's certification and legal requirements.

## Focus and programmatic semantics

- Provide a high-contrast visible focus indicator that does not rely on color alone.
- Expose name, role, value, state, position, and available action to supported assistive technology.
- Keep reading/narration order aligned with logical focus order.
- Announce layer changes, errors, remap listening, connection changes, and time-sensitive state.
- Do not move focus on asynchronous content arrival unless the user's action requested it.
- Restore focus after closing layers and recover when content disappears.

When the runtime has both DOM focus and a custom navigation model, keep them synchronized where assistive technology depends on DOM focus. Avoid duplicate announcements.

## Text and captions

- Support user-selected text scale and platform text settings where available.
- Reflow rather than clip or truncate critical labels and values.
- Keep subtitle/caption regions separate from HUD and prompts.
- Provide caption speaker identity and non-speech information when relevant.
- Do not put essential instructions only in fast transient toasts.
- Give users enough time to read, or allow dismissal/history.

Test with long error messages, large numbers, mixed scripts, and the largest supported text size.

## Color, contrast, motion, and sensory load

- Use icons, shapes, labels, or patterns in addition to color.
- Check contrast for text, focus, controls, charts, and state indicators.
- Offer reduced motion and remove camera/UI motion that is decorative or disorienting.
- Review flashes and repeated patterns for photosensitivity risk.
- Allow independent reduction or disabling of UI sounds and haptics.
- Preserve complete meaning when audio, haptics, or animation is off.

## Localization contract

Design from semantic content, not fixed English geometry:

- Reserve space for text expansion; test at least 30–50% expansion where the locale set is unknown.
- Support wrapping and flexible rows before shrinking type.
- Externalize labels, prompts, input descriptions, error messages, and narration strings.
- Format numbers, currency, dates, time, pluralization, names, and sorting by locale.
- Keep button glyphs separate from sentence grammar so translators can reorder copy.
- Mirror directional layout for RTL where meaning is spatial, while preserving media timelines, game-world coordinates, and platform conventions where mirroring would be wrong.
- Recalculate focus geometry after layout direction and text-size changes.

Never build focus IDs from translated labels. Use stable semantic IDs.

## RTL navigation review

Decide per component whether left/right means:

- Physical direction on screen
- Previous/next in reading order
- Decrease/increase value
- Previous/next media time
- Game-world direction

Only reading-order semantics normally reverse. Document exceptions and test them; automatic mirroring without semantic intent creates contradictory controls.

## Accessibility acceptance matrix

Test each critical flow with:

- D-pad only
- One-hand/sequential input
- Remapped navigation and confirm/back
- Largest supported text
- Narration or screen-reader mode where supported
- Captions plus a busy HUD
- High contrast and common color-vision simulations
- Reduced motion, audio off, and haptics off
- Long localized strings and RTL
- Controller disconnect and replacement

Record failures by semantic action and focus ID so fixes remain valid across device bindings.

## Primary guidance

- [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines) — platform-oriented reviews for text, contrast, cues, captions, narration, input, navigation, focus, errors, motion, and photosensitivity.
- [XAG 101: Text display](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101) — text legibility and configurability considerations.
- [XAG 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) — remapping and alternative input expectations.
- [XAG 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) — reachable and understandable navigation.
