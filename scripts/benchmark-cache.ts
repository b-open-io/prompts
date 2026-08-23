import { createHash } from "crypto";

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
      model,
      skill,
      evalId: evalCase.id,
      variant,
      prompt: evalCase.prompt,
      expectedOutput: evalCase.expected_output,
      assertions: evalCase.assertions,
      skillContent: variant === "with-skill" ? skillContent : "",
    }))
    .digest("hex")
    .slice(0, 16);
}
