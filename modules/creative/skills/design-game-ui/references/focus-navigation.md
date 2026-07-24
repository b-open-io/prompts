# Deterministic Spatial Focus

Directional navigation is a graph problem with geometric defaults. Geometry chooses likely candidates; explicit overrides resolve ambiguity and encode product intent.

## Define focus containers

Partition the interface into containers such as the navigation rail, content grid, toolbar, dialog, and settings list. For each container, specify:

- Entry target from every adjacent container
- Default target when no history exists
- Remembered last target
- Directional exit rules
- Wrap or no-wrap policy
- Scroll ownership
- Empty, loading, and disabled behavior
- Recovery target when an element disappears

Only the active layer may contain active focus. Trap focus in a modal or overlay until it closes, then restore focus to the opener or an explicit successor.

## Candidate selection

For a directional action:

1. Use an explicit neighbor override if it points to an enabled, visible item.
2. Otherwise collect enabled, visible candidates in the requested half-plane.
3. Prefer candidates whose projected edge overlaps the current item on the travel axis.
4. Score primary-axis distance more heavily than secondary-axis offset.
5. Apply stable tie-breakers such as DOM/registry order and stable ID.
6. Scroll the owning container when the best logical candidate is outside the viewport.
7. If no candidate exists, use the container exit, boundary behavior, or remain focused with feedback.

Do not rely on nearest Euclidean distance alone; it often produces diagonal jumps that feel arbitrary. Keep the scoring function deterministic and cover every irregular layout with fixtures.

Treat the W3C CSS Spatial Navigation specification as a useful working-draft vocabulary, not a cross-runtime guarantee. Inspect the target browser or framework and retain application-level overrides.

## Visibility and scrolling

Move logical focus and visibility as one transaction:

- Scroll just enough to expose the focused item within the safe content viewport.
- Keep focus indicators out of clipped regions and beneath no overlays.
- Avoid large recentering jumps for every step.
- For virtualized lists, preserve stable item IDs and materialize the intended target before moving focus.
- At a scroll boundary, distinguish “more content in this direction” from “leave this container.”
- Do not create invisible focus targets as placeholders.

When content loads asynchronously, do not steal focus from a valid user choice. If the focused item disappears, recover by stable ID, nearest logical sibling, container entry target, then shell fallback—in that order.

## Focus memory

Store focus memory per container and screen using stable semantic IDs, not element references or array indices. Restore memory when returning from:

- A details screen
- A modal or overlay
- A tab or rail destination
- A temporary pointer interaction
- Sleep or suspended state when product policy permits

Invalidate stale memory when its permission, route, or content no longer exists. Never restore focus behind the active layer.

## Pointer coexistence

Choose and document one mode policy:

- **Hybrid focus:** pointer hover may update focus for focusable controls.
- **Independent pointer:** pointer activity hides or softens the focus ring while preserving the last directional target.

In either policy, directional input must restore visible focus immediately. Do not let hover on decorative or disabled elements erase focus. Touch interaction should not invent hover semantics.

## Explicit focus map template

| Focus ID | Container | Up | Down | Left | Right | Confirm | On removal |
|---|---|---|---|---|---|---|---|
| `library.item.42` | `library.grid` | auto | auto | `nav.library` | auto | open details | next item, previous item, grid entry |

Use `auto` only where geometry is stable and tested. Use explicit IDs at bridges between a rail and content, asymmetric settings rows, carousels, and layouts with spanning tiles.

## Focus appearance

- Make focus unmistakable at couch distance and under common color-vision differences.
- Use more than a subtle color shift: outline, scale within safe bounds, shape, elevation, or motion.
- Ensure the ring is not clipped and remains legible over imagery.
- Separate focused, selected, pressed, disabled, and loading states.
- Respect reduced-motion settings; focus must remain clear without animation.
- Expose programmatic focus semantics for assistive technologies supported by the platform.

## Test fixtures

Create deterministic traversal tests for:

- Regular and irregular grids
- Sparse final rows and spanning tiles
- Disabled and hidden controls
- Virtualized lists and data refresh
- Nested horizontal/vertical containers
- Rail-to-content bridges
- Opening and closing every overlay
- Resize, localization expansion, and RTL
- Pointer-to-directional handoff
- Removal of the focused item

Assert both the next focus ID and the expected scroll/container transition. Add a fixture whenever a production navigation surprise is fixed.

## Primary guidance

- [W3C CSS Spatial Navigation Level 1](https://www.w3.org/TR/css-nav-1/) — working-draft terminology for focus containers, candidates, and scroll/navigation behavior; validate runtime support before relying on it.
- [Spotify Engineering: TV Spatial Navigation](https://engineering.atspotify.com/2023/5/tv-spatial-navigation) — production engineering case study covering navigation structures and performance tradeoffs.
