export const RUNTIMES = [
  { id: "claude", label: "Claude Code", tier: "supported" },
  { id: "codex", label: "Codex", tier: "supported" },
  { id: "grok", label: "Grok Build", tier: "supported" },
  { id: "opencode", label: "OpenCode", tier: "experimental" },
  { id: "hermes", label: "Hermes", tier: "experimental" },
  { id: "generic", label: "Generic", tier: "fallback" },
] as const;

export type Runtime = (typeof RUNTIMES)[number]["id"];
export type RuntimeTier = (typeof RUNTIMES)[number]["tier"];

export const RUNTIME_IDS: readonly Runtime[] = RUNTIMES.map((runtime) => runtime.id);

export function isRuntime(value: string): value is Runtime {
  return (RUNTIME_IDS as readonly string[]).includes(value);
}
