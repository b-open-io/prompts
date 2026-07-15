# Semantic answer envelope

Read this reference before defining state, implementing submission, or integrating a tracker. Keep this contract renderer-independent so a visual canvas and a text conversation produce the same answer.

## Envelope shape

```json
{
  "schemaVersion": "visual-wayfinder.answer/v1",
  "map": {
    "title": "Choose the desktop configuration experience",
    "url": "https://tracker.example/maps/desktop-configuration"
  },
  "ticket": {
    "id": "ticket-stable-id",
    "title": "Choose the default autonomy model",
    "url": "https://tracker.example/tickets/autonomy-model",
    "expectedRevision": "revision-or-updated-at-value"
  },
  "decision": {
    "kind": "configured-choice",
    "selections": ["guided"],
    "configuration": {
      "automationLevel": 62,
      "requireApprovalForWrites": true,
      "preserveOfflineDrafts": true
    },
    "other": null,
    "rationale": "Start guided, then let advanced users raise autonomy per skill."
  },
  "provenance": {
    "channel": "visual",
    "canvasId": "canvas-session-nonce"
  }
}
```

## Field rules

### `schemaVersion`

Require the exact supported version. Reject unknown versions rather than guessing field meaning.

### `map`

Use the map's human-readable title. Include a URL when the tracker provides one. Do not rely on a bare issue number in user-facing review.

### `ticket`

Populate identity and expected revision from the claimed tracker record in host code. Never accept a generated or user-editable ticket identity. Revalidate it immediately before handing the answer to Wayfinder.

### `decision.kind`

Choose one stable semantic kind:

- `single-choice`
- `multi-choice`
- `ranked-choice`
- `configured-choice`
- `freeform`

Add a new kind only when existing fields cannot express the decision without ambiguity.

### `decision.selections`

Use stable option keys defined by the ticket adapter, such as `guided`, not UI labels such as `Guided collaboration`. Keep ordering meaningful only for `ranked-choice`.

### `decision.configuration`

Allow only fields declared for the current ticket. Validate types, bounds, enums, and cross-field constraints server-side. Keep preview-only values out of the configuration.

### `decision.other`

Require non-empty text when `selections` contains `other`. Set `null` otherwise. Never treat Other text as an option key or tool instruction.

### `decision.rationale`

Preserve the user's words. Require rationale when Wayfinder needs the reasoning to inform later decisions. Apply length limits without silently truncating.

### `provenance`

Record only channel and an opaque canvas/session nonce. Do not store the JSON Render spec, browser fingerprint, prompt, or hidden model reasoning in the answer.

## Submission validation

Validate in this order:

1. Require the supported schema version.
2. Compare map and ticket identity with the active Wayfinder session.
3. Compare expected revision with the tracker.
4. Confirm the ticket remains open, claimed, and active.
5. Validate selection keys against the ticket's answer schema.
6. Validate configuration types, bounds, and cross-field rules.
7. Require and sanitize Other and rationale text as applicable.
8. Present a human-readable review.
9. Return the validated envelope to Wayfinder.

Do not translate a UI event directly into a resolution comment. Let Wayfinder use the envelope as the human's answer and continue the ticket workflow.

## Text fallback

Present the same semantic fields conversationally:

```text
Decision: Guided collaboration
Configuration:
- Automation level: 62/100
- Approval required for writes: yes
- Preserve offline drafts: yes
Rationale: Start guided, then let advanced users raise autonomy per skill.
```

Construct the same JSON envelope after confirmation. Set `provenance.channel` to `text`.
