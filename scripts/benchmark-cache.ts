import { createHash } from "node:crypto";

/** Changing this namespace invalidates results produced before clean-arm isolation. */
export const BENCHMARK_CACHE_NAMESPACE = "text-body-ablation-v2";
export const BENCHMARK_CACHE_VERSION = 2;

export interface BenchmarkAssertion {
  id: string;
  text: string;
  type: string;
}

export interface BenchmarkEvalCase {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
  assertions: BenchmarkAssertion[];
}

export function benchmarkCacheKey(
  model: string,
  skill: string,
  evalCase: BenchmarkEvalCase,
  variant: "with-skill" | "baseline",
  skillContent: string,
): string {
  return createHash("sha1")
    .update(JSON.stringify({
      namespace: BENCHMARK_CACHE_NAMESPACE,
      version: BENCHMARK_CACHE_VERSION,
      model,
      skillIdentity: skill,
      evalId: evalCase.id,
      variant,
      prompt: evalCase.prompt,
      expectedOutput: evalCase.expected_output,
      files: evalCase.files,
      assertions: evalCase.assertions,
      skillContent: variant === "with-skill" ? skillContent : "",
    }))
    .digest("hex")
    .slice(0, 16);
}
