# MCP Apps Patterns Reference

Verify every API name against the installed Ext Apps release. These patterns describe boundaries and responsibilities rather than a frozen wire format.

## Model-visible launch, app-only submit

Expose one model-visible tool to open the View. Keep direct UI interactions out of the model tool list when safe:

```typescript
registerAppTool(server, "submit-decision-draft", {
  description: "Validate and submit a draft from the decision View.",
  inputSchema: submitSchema,
  _meta: {
    ui: {
      resourceUri,
      visibility: ["app"],
    },
  },
}, async (input) => {
  const result = await validateAndSubmit(input);
  return {
    content: [{ type: "text", text: result.summary }],
    structuredContent: { result },
  };
});
```

App-only does not mean trusted. Recheck authorization, revision/nonces, IDs, bounds, and domain invariants.

## Text plus structured data

Keep the model summary concise and the View data bounded:

```typescript
return {
  content: [{
    type: "text",
    text: `Decision is ready: ${decision.question}`,
  }],
  structuredContent: {
    interactionId: decision.interactionId,
    revision: decision.revision,
    question: decision.question,
    options: decision.options,
  },
};
```

Do not assume `structuredContent` is unlimited or invisible to all logging. Validate it, cap it, and omit secrets and unnecessary PII.

## Static resource, dynamic result

Register one stable resource URI and vary the tool result:

```typescript
const resourceUri = "ui://decision-workbench/index.html";
```

Never embed user IDs, ticket IDs, or untrusted paths in the resource URI. Put identifiers in validated tool inputs/results.

## Capability fallback

Maintain a complete text workflow. If the host does not negotiate Apps support, return the same question, options, recommendation, and answer instructions as text. A standalone browser UI may be offered when richer interaction is essential.

## Host context

Apply theme, font, safe-area, dimensions, available display modes, and reduced-motion signals with fallbacks. Do not assume all fields exist.

## State

Use three layers deliberately:

1. View-local draft state for immediate interaction.
2. An app-only tool for authoritative server validation/persistence.
3. Small model-context updates only when the next conversational turn needs the selected state.

Use `viewUUID` for per-view recovery when supported and required. Include a domain revision or nonce for mutable submissions; they solve different problems.

## Teardown

Flush only small pending drafts during teardown. Never rely on teardown as the sole persistence path because hosts may terminate abruptly.

## Polling and visibility

Pause polling, animation, and expensive rendering when the View is hidden. Use an app-only refresh tool rather than direct network access when practical. Bound concurrency and apply backoff.

## Errors

Return human-readable, recoverable errors to the View and a concise model-visible summary. Distinguish:

- Validation errors the user can fix.
- Stale/conflict errors that require refresh.
- Authorization errors.
- Host capability failures.
- Server/tool failures.

Never expose stack traces, secrets, or internal filesystem paths.

## External links

Open external destinations through the host API. Validate allowed schemes and destinations server-side when links come from data.

## Generative UI

Keep authoritative question data outside the generated component graph. Let a validated JSON Render spec reference state by stable IDs. Validate the spec before rendering and retain a text answer path.

Prefer whole-spec generation for small interactions. Add streaming only after proving it improves latency or comprehension. Use edit modes for bounded refinements instead of regenerating unrelated UI.
