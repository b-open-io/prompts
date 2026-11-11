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
    expect(benchmarkCacheKey("model", "skill", evalCase, "with-skill", "before", "high"))
      .not.toBe(benchmarkCacheKey("model", "skill", evalCase, "with-skill", "after", "high"));
  });

  test("does not invalidate baselines when SKILL.md changes", () => {
    expect(benchmarkCacheKey("model", "skill", evalCase, "baseline", "before", "high"))
      .toBe(benchmarkCacheKey("model", "skill", evalCase, "baseline", "after", "high"));
  });

  test("invalidates runs when the grading contract changes", () => {
    const changed = {
      ...evalCase,
      assertions: [
        ...evalCase.assertions,
        { id: "second", text: "Includes the implementation boundary.", type: "qualitative" },
      ],
    };
    expect(benchmarkCacheKey("model", "skill", evalCase, "baseline", "", "high"))
      .not.toBe(benchmarkCacheKey("model", "skill", changed, "baseline", "", "high"));
  });

  test("keeps equal bare skill names isolated by qualified identity", () => {
    expect(benchmarkCacheKey("model", "review:skill", evalCase, "baseline", "", "high"))
      .not.toBe(benchmarkCacheKey("model", "other:skill", evalCase, "baseline", "", "high"));
  });

  test("keeps runs at different efforts apart", () => {
    expect(benchmarkCacheKey("model", "skill", evalCase, "baseline", "", "low"))
      .not.toBe(benchmarkCacheKey("model", "skill", evalCase, "baseline", "", "high"));
  });

  test("invalidates when the eval file contract changes", () => {
    const changed = { ...evalCase, files: ["fixtures/example.ts"] };
    expect(benchmarkCacheKey("model", "skill", evalCase, "baseline", "", "high"))
      .not.toBe(benchmarkCacheKey("model", "skill", changed, "baseline", "", "high"));
  });
});
