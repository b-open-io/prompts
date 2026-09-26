# Settings declarations

Plugins and skills may publish a `settings.json` beside their plugin root or
`SKILL.md`. The file validates against `settings.schema.json`. Each setting has
five required fields:

- `source`: literal JSON source file (`~/…`) or `env`
- `key`: dotted JSON path, or environment variable name for `env`
- `type`: `boolean`, `enum`, `number`, or `string`
- `default`: safe fallback when the source is absent or invalid
- `tier`: `guard`, `workflow`, `model`, or `skill`

Renderers declare and detect controls from this data; they do not invent
storage. The bopen.ai web hub may emit commands but cannot read or write local
files. Agent Master may write declared sources after user confirmation. The
SessionStart hook only injects settings with `sessionContext: true`, skips every
`sensitive: true` declaration, accepts scalar values matching the declaration,
and caps its output.

Core currently declares these model defaults:

| Environment key | Session context | Default |
|---|---|---|
| `BOPEN_WORKER_MODEL` | `models.worker` | `claude-opus-5-5` |
| `BOPEN_ADVISOR_MODEL` | `models.advisor` | `claude-opus-5-5` |

Code review uses `gpt-6-sol` or `gpt-6-astra` at `xhigh` reasoning, never the
default effort. Grok is not a normal worker default; use it only under
usage-credit pressure, pinning `grok-4.7`.

New declarations should include `label`, `description`, `options` for enums,
and a short `contextKey` when the value belongs in session context. Secrets and
credentials must be marked sensitive and must not opt into session context.
