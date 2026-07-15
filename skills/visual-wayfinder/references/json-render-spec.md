# JSON Render decision canvas

Read this reference when defining the catalog or producing a JSON Render spec. Read the current upstream JSON Render skills first; treat them as authoritative for package APIs.

## Catalog policy

Start with the smallest catalog capable of answering the ticket:

| Component | Purpose | State behavior |
| --- | --- | --- |
| `Stack` | Vertical or horizontal grouping | none |
| `Grid` | Responsive comparison layout | none |
| `Section` | Label a decision sub-area | none |
| `Text` | Explain context or assumptions | none |
| `Notice` | Show warning, estimate, or unknown | none |
| `ChoiceCards` | Select one semantic option | bind one stable key |
| `ToggleGroup` | Select boolean/multiple constraints | bind allowlisted keys |
| `RankList` | Order stable option keys | bind a validated array |
| `RangeControl` | Set a bounded number | bind number |
| `TradeoffTable` | Compare supplied option facts | read-only selection context |
| `ConsequencePanel` | Display deterministic derived effects | read-only computed values |
| `TextResponse` | Capture Other or rationale | bind escaped text |

Omit general-purpose `Button`, `Link`, HTML, iframe, markdown-with-HTML, code execution, and arbitrary tool action definitions. Keep the host submit control outside the JSON spec.

## Minimum prop contract

Define these shapes as actual catalog schemas, normally with Zod, before asking a model to generate a canvas. The table is the minimum interoperable contract used by this skill; an implementation may narrow enums or limits but must not silently reinterpret a field.

| Component | Required props | Optional props and rules |
| --- | --- | --- |
| `Stack` | none | `direction: "vertical" \| "horizontal"`, `gap: "sm" \| "md" \| "lg"` |
| `Grid` | `columns: 1 \| 2 \| 3` | `gap: "sm" \| "md" \| "lg"`; collapse responsively in host CSS |
| `Section` | `title: string` | `description: string` |
| `Text` | `text: string` | `variant: "body" \| "supporting" \| "lead"` |
| `Notice` | `tone: "info" \| "warning" \| "critical"`, `text: string` | `title: string` |
| `ChoiceCards` | `label`, `options`, bound `value` | each option is `{key,label,description?}`; keys are unique; value is one key or `null` |
| `ToggleGroup` | `label`, `options`, bound `value` | option shape matches choice cards; value is a unique key array |
| `RankList` | `label`, `options`, bound `value` | value contains every allowlisted key exactly once |
| `RangeControl` | `label`, `min`, `max`, `step`, bound `value` | `unit`, `lowLabel`, `highLabel`; value must land on a step within bounds |
| `TradeoffTable` | `columns`, `rows` | `selected`; every row is `{key,label,values}` and values length equals columns length |
| `ConsequencePanel` | `title`, `status`, `items` | every item is `{key,label,value,provenance}` and provenance is `Derived`, `Estimated`, or `Unknown` |
| `TextResponse` | `label`, bound `value` | `required`, `maxLength`, `placeholder`; render as escaped plain text |

Apply finite string and collection limits in each schema. Components that bind values must implement JSON Render's `useBoundProp`; read-only components must not receive bindings. The examples below are normative for these field names but illustrative for copy, option values, and registered function names.

## Flat spec example

Use the current flat format: `root` contains an element ID and `elements` contains the element map.

```json
{
  "root": "decision-canvas",
  "elements": {
    "decision-canvas": {
      "type": "Stack",
      "props": { "gap": "lg" },
      "children": ["intro", "choices", "configuration", "tradeoffs", "preview", "other", "rationale"]
    },
    "intro": {
      "type": "Text",
      "props": {
        "variant": "lead",
        "text": "Choose the default collaboration model. Settings can refine the selected model without resolving another ticket."
      },
      "children": []
    },
    "choices": {
      "type": "ChoiceCards",
      "props": {
        "label": "Default model",
        "options": [
          { "key": "guided", "label": "Guided", "description": "Preview changes and ask before consequential actions." },
          { "key": "autonomous", "label": "Autonomous", "description": "Proceed within declared guardrails and report results." },
          { "key": "adaptive", "label": "Adaptive", "description": "Escalate according to risk and confidence." },
          { "key": "other", "label": "Other", "description": "Describe a model not represented here." }
        ],
        "value": { "$bindState": "/answer/selection" }
      },
      "children": []
    },
    "configuration": {
      "type": "Grid",
      "props": { "columns": 2, "gap": "md" },
      "children": ["automation", "approval"]
    },
    "automation": {
      "type": "RangeControl",
      "props": {
        "label": "Automation level",
        "min": 0,
        "max": 100,
        "step": 1,
        "value": { "$bindState": "/answer/configuration/automationLevel" }
      },
      "children": []
    },
    "approval": {
      "type": "ToggleGroup",
      "props": {
        "label": "Safety constraints",
        "options": [
          { "key": "requireApprovalForWrites", "label": "Approve external writes" },
          { "key": "preserveOfflineDrafts", "label": "Preserve offline drafts" }
        ],
        "value": { "$bindState": "/answer/constraints" }
      },
      "children": []
    },
    "tradeoffs": {
      "type": "TradeoffTable",
      "props": {
        "selected": { "$state": "/answer/selection" },
        "columns": ["Control", "Speed", "Setup"],
        "rows": [
          { "key": "guided", "label": "Guided", "values": ["High", "Medium", "Low"] },
          { "key": "autonomous", "label": "Autonomous", "values": ["Medium", "High", "High"] },
          { "key": "adaptive", "label": "Adaptive", "values": ["High", "High", "Medium"] }
        ]
      },
      "children": []
    },
    "preview": {
      "type": "ConsequencePanel",
      "props": {
        "title": "Live consequence preview",
        "status": "Estimated",
        "items": [
          {
            "key": "control",
            "label": "Human control",
            "value": {
              "$computed": "estimateControl",
              "args": {
                "selection": { "$state": "/answer/selection" },
                "automation": { "$state": "/answer/configuration/automationLevel" }
              }
            },
            "provenance": "Estimated"
          },
          {
            "key": "setup",
            "label": "Setup effort",
            "value": {
              "$computed": "estimateSetup",
              "args": {
                "selection": { "$state": "/answer/selection" },
                "constraints": { "$state": "/answer/constraints" }
              }
            },
            "provenance": "Estimated"
          }
        ]
      },
      "children": []
    },
    "other": {
      "type": "TextResponse",
      "props": {
        "label": "Describe the other model",
        "value": { "$bindState": "/answer/other" },
        "required": true
      },
      "visible": { "$state": "/answer/selection", "eq": "other" },
      "children": []
    },
    "rationale": {
      "type": "TextResponse",
      "props": {
        "label": "Why is this the right default?",
        "value": { "$bindState": "/answer/rationale" },
        "required": true
      },
      "children": []
    }
  }
}
```

The example intentionally contains no submit component or tracker action.

## Initial state

Seed state from host-owned semantic defaults, not from arbitrary generated content:

```json
{
  "answer": {
    "selection": "adaptive",
    "configuration": { "automationLevel": 62 },
    "constraints": ["requireApprovalForWrites", "preserveOfflineDrafts"],
    "other": "",
    "rationale": ""
  },
  "context": {
    "ticketRevision": "tracker-revision",
    "canvasId": "opaque-session-nonce"
  }
}
```

Restrict writes to `/answer`. Treat `/context` as read-only.

## Deterministic functions

Register named functions in host code and validate their argument shapes. Keep them pure. Return display data only; never perform network, filesystem, or tracker operations from a computed function.

Use reviewed directives such as formatting or math for presentation-level transformations. Keep domain policy, authorization, and meaningful projections in named host functions with tests.

## Validation gates

Before rendering:

1. Require a string `root` that exists in `elements`.
2. Require every child ID to exist exactly once in the reachable tree.
3. Reject unknown component and action names.
4. Reject generated links, URLs, HTML, scripts, and tool identifiers.
5. Restrict bindings to declared `/answer` paths.
6. Restrict reads to declared `/answer` and `/context` paths.
7. Enforce component prop schemas, content limits, and maximum element count.
8. Reject cycles and unreachable decision controls.
9. Confirm the canvas has no submit/navigation component.
10. Regenerate once, then fall back to text.
