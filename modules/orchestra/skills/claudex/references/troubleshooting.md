# claudex troubleshooting

Match the symptom, apply the fix. Each row maps a surface failure to the
underlying drift — an incomplete OAuth, a key mismatch, a dead launchd service,
or an unloaded alias.

| Symptom | Cause | Fix |
|---|---|---|
| Model list is `[]` | OAuth never completed | Re-run `cliproxyapi --codex-login`; confirm a `codex-*.json` file exists in `~/.cli-proxy-api/`. |
| `401` from the proxy | Alias key doesn't match `api-keys` in the conf | Align the key, then `brew services restart cliproxyapi` (the conf is only re-read on restart). |
| `Connection refused` on 8317 | Proxy not running, or the port is taken | `brew services info cliproxyapi` — if it isn't running, check nothing else holds 8317 and read the logs via `brew services`. |
| `claudex` answers as Claude/Anthropic | The alias didn't load | `source ~/.zshrc`, then confirm `which claudex` reports the alias (not the plain `claude` binary). |

## Drift to watch — the volatile surface

`claudex` depends on three things that live upstream and change on someone
else's schedule. When they move, the fixes above (and this file) are where the
patch lands:

- **The OAuth token** expires or is revoked. Symptom: an empty model list or a
  sudden auth failure after it was working. Fix: re-run `--codex-login`.
- **The `gpt-5.6-sol` model ID** can be renamed or superseded upstream. If the
  smoke test fails with an unknown-model error, check the live model list
  (step 05 in [setup.md](setup.md)) and update the alias's `--model` and the
  `*_MODEL` env vars to the current ID.
- **The CLIProxyAPI conf schema** (`host`, `api-keys`, the `payload.override`
  block) can change across versions. After a `brew upgrade cliproxyapi`,
  re-check the conf against the current step 02 shape before assuming a code
  problem.

## Confirming the whole chain

When unsure which link is broken, verify outward from the proxy:

1. **Is the service up?** `brew services info cliproxyapi` → running.
2. **Does the proxy see the models?** Step 05's `curl` → `gpt-5.6-sol` present.
3. **Does the alias resolve?** `which claudex` → the alias, and `type claudex`
   shows the inline env vars.
4. **End to end?** `claudex -p "Reply with exactly: claudex works."`

A green result at step N with a failure at N+1 isolates the break to that link.
