# Convert an Existing App

Preserve product capability while replacing its interaction shell. Treat the source app as a behavior specification, not merely a source of copy and colors.

## 1. Build the inventory

Walk every route and inspect the source. Create a row for each user-facing surface:

| Existing surface | User goal | State owner | Actions and side effects | Pointer dependency | Proposed role | Migration decision |
|---|---|---|---|---|---|---|
| `/example` | What the user accomplishes | store, hook, service, route | load, save, delete, buy | hover, drag, wheel | shell, screen, HUD, overlay | preserve, adapt, replace, defer |

Include loading, empty, offline, error, unauthorized, and destructive states. Record deep links, browser Back semantics, data refresh, optimistic updates, permission boundaries, and analytics events.

Do not call a migration complete while any reachable action exists only through pointer input.

## 2. Separate behavior from presentation

Identify the seams that should survive the conversion:

- Route registry or screen registry
- Domain stores, query caches, services, and mutations
- Authentication and permission checks
- Business rules and destructive-action safeguards
- Existing forms and validation
- Analytics event meaning

Build the game shell around these owners. Avoid copying domain logic into HUD widgets or controller handlers.

## 3. Classify and map

Use the smallest suitable surface:

- Put global navigation and identity in the shell.
- Put one coherent goal in each screen.
- Put glanceable live state in the HUD.
- Put temporary subordinate work in an overlay.
- Reserve modals for decisions that truly block progress.
- Use toasts only for acknowledgements that do not need focus.

If the new design changes task order, deletes a route, collapses distinct actions, or exposes sensitive information on a shared television, call that out as a product decision.

## 4. Replace pointer idioms

| Pointer idiom | Directional alternative | Constraint |
|---|---|---|
| Hover reveal | Focus preview or visible secondary label | Must not trigger destructive work |
| Click | Confirm action | One stable semantic action |
| Double click | Explicit open/launch action | Avoid timing-dependent necessity |
| Right click | Menu action | Expose it through an affordance too |
| Wheel | D-pad movement, page actions, analog scroll | Always retain a digital path |
| Drag/reorder | Pick up → move → place/cancel | Announce moving state and destination |
| Click outside | Back | Return focus to opener |
| Tiny icon target | Full focusable row/tile | Keep visible focus and clear label |

Specify device-switch behavior. When pointer activity begins, preserve the last controller focus. When directional input resumes, restore it or choose the container's deterministic entry target.

## 5. Use a shell contract

A bOpen.AI-style shell works well when it exposes stable primitives rather than embedding feature logic:

- An input provider normalizes device events into semantic actions.
- A shell provider owns navigation mode, active layer, and shared display preferences.
- A screen registry maps stable IDs to routes or screen components.
- A shell frame owns global chrome, safe area, status regions, and overlay portals.
- Reusable value rows, focusable tiles, prompts, and section headers make behavior consistent.

Keep screens independently testable. A screen should declare its initial focus target and actions but should not need to understand raw gamepad indices or remote key codes.

## 6. Migrate vertically

Implement in slices:

1. Normalize input and render a visible focus indicator.
2. Add shell, routing, Back, and focus restoration.
3. Migrate one representative screen including loading/error/empty states.
4. Add settings and remapping before the surface area becomes large.
5. Migrate remaining screens by risk and frequency.
6. Add HUD and transient feedback after navigation is stable.
7. Harden platform behavior, performance, localization, and accessibility.

For every slice, test with pointer disabled and complete the primary flow using only the weakest supported directional device.

## Migration acceptance checklist

- All existing critical routes and actions appear in the preservation map.
- State and side-effect owners are unchanged or explicitly justified.
- Deep links and Back behavior have defined outcomes.
- Loading, empty, offline, error, permissions, and destructive states are covered.
- No required action depends on hover, drag, wheel, double click, or clicking outside.
- Switching between pointer and directional input cannot strand focus.
- Analytics preserves event meaning and adds navigation-quality signals separately.
