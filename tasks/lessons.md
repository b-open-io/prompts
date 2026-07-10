# Lessons

## Do not infer model unavailability from truncated or sandbox-degraded CLI output

When a model-list command prints its heading but no entries, classify the probe
as incomplete rather than concluding that a requested model is unavailable.
Check exit status, stderr, network/auth context, and—when available—prefer the
user's successful terminal output. For Grok routing in particular, pin
`grok-4.5` only after a complete `grok models` result or explicit user evidence;
the user's July 2026 output confirms that `grok-4.5` is available.
