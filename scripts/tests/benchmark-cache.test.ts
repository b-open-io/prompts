import { describe, expect, test } from "bun:test";
import { benchmarkCacheKey, type BenchmarkEvalCase } from "../benchmark-cache";

const evalCase: BenchmarkEvalCase = {
  id: 1,
  prompt: "Review this design.",
  expected_output: "Correct the stale assumption.",
  files: [],
  assertions: [
    { id: "corrects-assumption", text: "Corrects the assumption.", type: "qualitative" },
  ],
};

describe("benchmarkCacheKey", () => {
  test("invalidates with-skill runs when SKILL.md changes", () => {
    expect(benchmarkCacheKey("model", "skill", evalCase, "with-skill", "before"))
      .not.toBe(benchmarkCacheKey("model", "skill", evalCase, "with-skill", "after"));
  });

  test("does not invalidate baselines when SKILL.md changes", () => {
    expect(benchmarkCacheKey("model", "skill", evalCase, "baseline", "before"))
      .toBe(benchmarkCacheKey("model", "skill", evalCase, "baseline", "after"));
  });

  test("invalidates runs when the grading contract changes", () => {
    const changed = {
      ...evalCase,
      assertions: [
        ...evalCase.assertions,
        { id: "second", text: "Includes the implementation boundary.", type: "qualitative" },
      ],
    };
    expect(benchmarkCacheKey("model", "skill", evalCase, "baseline", ""))
      .not.toBe(benchmarkCacheKey("model", "skill", changed, "baseline", ""));
  });
});
