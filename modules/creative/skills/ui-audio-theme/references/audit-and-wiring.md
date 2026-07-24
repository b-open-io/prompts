# Existing-App Audio Audit and Wiring

Use this workflow whenever an application already has an audio theme, when a
feature adds new semantic operations (authentication, payments, blockchain,
game controls, and so on), or when a user asks whether sounds are actually
wired to the events their names imply. Run it before generating replacements:
a pleasing asset cannot fix an incorrect event boundary.

The audit has two outputs:

1. an event map based on `assets/event-map-template.json`; and
2. a passing report from `scripts/audit_theme.py`.

The UI-audio specialist owns this audit, the theme-slot mapping, audition, and
asset acceptance. The application engineer owns runtime event boundaries and
playback lifecycle. For games and television interfaces, consume the semantic
feedback-event map from `design-game-ui`, then use this workflow to verify the
audio mapping and implementation.

## 1. Establish the audit boundary

Record the application root, running URL, source revision, current
`theme.json`, playback helper/provider, and any constants or hooks that expose
sound names. Do not assume that a generated theme slot is in use merely because
its asset exists or appears in constants.

Review all of these areas explicitly:

- **routes** — global navigation, links, tabs, cards, pagination, route
  transitions, empty and error routes;
- **overlays** — dialogs, drawers, menus, dropdowns, popovers, actual tooltip
  reveals, toasts, and dismissals;
- **async** — pending, progress, success, retry, cancellation, timeout, and
  error transitions;
- **auth** — sign in/out, identity or wallet connection, authorization,
  challenge, rejection, expiry, and recovery;
- **payment** — checkout, approval, submission, receipt, refund, and failure;
- **blockchain** — signature request, user rejection, broadcast, mempool or
  pending state, confirmation, receipt, and incoming transactions;
- **keyboard** — semantic activation and dismissal, roving focus, shortcuts,
  repeat behavior, and text entry;
- **gamepad** — semantic navigation, confirm/cancel, held input, focus
  boundaries, connection changes, and unavailable states.

Mark an area `not_applicable` with a reason rather than silently omitting it.
An empty reviewed inventory also needs a reason. This makes later feature
drift visible.

## 2. Inventory semantic interactions

Search routes and shared components first, then feature modules and integration
callbacks. Look for click/pointer/focus/key/gamepad handlers, open-state
transitions, toasts, async status changes, auth callbacks, payment results, and
wallet or blockchain APIs. Inspect delegated global handlers carefully: broad
selectors often make a tooltip, click, or success sound stand in for unrelated
events.

Write one interaction record per **semantic state transition**, not per raw
input. Enter and Space activating the same control normally map to the same
event. A transaction sound belongs at the verified broadcast or confirmation
boundary, not merely on the button that starts the request. A tooltip sound
belongs to the closed-to-visible transition, not every hovered element.

For each record, choose exactly one decision:

- `{"type": "sound", "sound": "theme-slot"}`; or
- `{"type": "silence", "reason": "..."}`.

Intentional silence is a real design decision. It is often right for text
entry, disabled controls, passive polling, cursor movement, repeated keydown,
and intermediate states already communicated clearly. Likewise, an unused
theme slot is not a defect: report it, but never invent an interaction just to
consume it.

Reuse a slot only when the events have the same meaning and repetition profile.
Keep these meanings distinct even when their current waveforms are similar:

- main-navigation hover;
- general interactive-item hover;
- a real tooltip becoming visible;
- activation/click;
- request submitted;
- transaction broadcast;
- transaction confirmed.

## 3. Record two forms of evidence

Every event-map record requires both:

- **source evidence** — file, optional line, and an observation explaining the
  event boundary and selected sound; and
- **browser evidence** — tested URL, exact reproduction steps, an observation
  covering visible and audible behavior, and `"result": "pass"`.

Source inspection alone cannot prove delegated handlers, re-renders, browser
autoplay, volume, or duplicated playback. Browser listening alone cannot prove
that a success sound fires after the correct API boundary. Keep both.

Unlock browser audio with a user gesture before testing hover cues. Test with
the application's actual volume multiplier. Exercise success, failure,
cancellation, and repeated/rapid input paths. For authenticated, payment, and
blockchain flows, use safe test accounts or sandbox/testnet operations.

## 4. Verify non-audio feedback and repetition

Audio must supplement an independently understandable visual, haptic, or
assistive-technology state. Record that alternative and set `verified` only
after observing it without relying on sound.

Every interaction also records a repetition policy. Typical policies include:

- once per closed-to-open or pending-to-complete transition;
- once per operation or transaction id;
- dedupe across re-renders and polling updates;
- throttle per newly entered hover/focus target;
- no sound for raw held-key or gamepad-repeat ticks;
- unrestricted repeat only when a deliberate test shows it remains usable.

Hover sounds should be quieter than activation cues and generally throttled.
Movement between descendants of the same semantic target must not retrigger a
hover cue. Keyboard and gamepad input should emit the semantic navigation or
activation event, not a parallel raw-input sound.

## 5. Validate the map

Copy and customize the event-map template, then run:

```bash
python3 scripts/audit_theme.py ./event-map.json \
  --theme ./public/audio/ui/theme.json
```

For CI or another agent, request structured output:

```bash
python3 scripts/audit_theme.py --event-map ./event-map.json \
  --theme ./public/audio/ui/theme.json --json
```

The validator reports an error and exits nonzero for incomplete coverage,
unmapped interactions, undocumented silence, unknown sound names, missing
theme assets, missing or failed evidence, unverified visual alternatives, and
unverified repetition policy. Unused theme slots are informational and do not
change the exit code.

## 6. Correct wiring, then audition

Fix event boundaries and mappings before changing assets. Prefer a semantic
audio API (`play("tx-sent")`) near the state transition over filename access in
components. Centralize playback lifecycle, autoplay unlock, mute/volume,
concurrency, and cleanup, while leaving semantic decisions in the relevant
feature.

After wiring changes:

1. rerun focused code tests;
2. repeat every affected browser-evidence scenario;
3. run the auditor until it passes;
4. audition changed slots in the sound picker at application volume; and
5. return the event map, audit output, accepted prompt/asset manifest, and any
   intentional unused slots to the implementation owner.

Re-run the complete audit whenever routes, overlays, auth/payment/blockchain
features, keyboard/gamepad controls, global event delegation, the event catalog,
or the accepted theme changes. A newly generated theme must include the
semantically required slots from the reviewed event map; it need not generate
or force every generic catalog slot.
