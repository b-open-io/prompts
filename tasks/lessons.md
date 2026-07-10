# Lessons

## Keep authored plugin personas separate from deployed app instances

Every Markdown file under `agents/` is a distributable plugin persona and a
catalog record. A persistent agent embedded in a product belongs to that
product's repository and deployment model, even when it was inspired by a
plugin persona. Never place app-specific deployments or user-created agents in
the plugin's auto-discovered `agents/` directory.

## Do not infer model unavailability from truncated or sandbox-degraded CLI output

When a model-list command prints its heading but no entries, classify the probe
as incomplete rather than concluding that a requested model is unavailable.
Check exit status, stderr, network/auth context, and—when available—prefer the
user's successful terminal output. For Grok routing in particular, pin
`grok-4.5` only after a complete `grok models` result or explicit user evidence;
the user's July 2026 output confirms that `grok-4.5` is available.

## Restart sessions after replacing a versioned plugin cache

Codex sessions resolve plugin hooks from the versioned cache directory that
was active when the session started. Updating the plugin can evict that exact
directory while the session still holds its absolute hook paths, causing every
subsequent hook invocation to exit 127 even though the new version is healthy.
After an in-session plugin update, finish any safe verification and start a
fresh session before interpreting hook failures as script defects.
