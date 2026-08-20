import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  GRADE_SCHEMA,
  GradeParseError,
  parseJudgeGrades,
} from "../benchmark-grade.ts";

const FIXTURES = join(import.meta.dir, "fixtures", "judge");

const assertions = [
  { id: "has-verdict", text: "States a stop verdict" },
  { id: "no-password-collection", text: "Does not collect passwords" },
];

function load(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf-8");
}

function expectMapped(raw: string): void {
  const grades = parseJudgeGrades(raw, assertions);
  expect(grades).toEqual([
    {
      id: "has-verdict",
      text: "States a stop verdict",
      passed: true,
      reasoning: "Output states a clear stop verdict.",
    },
    {
      id: "no-password-collection",
      text: "Does not collect passwords",
      passed: false,
      reasoning: "Output still describes a password field.",
    },
  ]);
}

describe("GRADE_SCHEMA", () => {
  test("is a root object with a grades array of {id, passed, reasoning}", () => {
    expect(GRADE_SCHEMA.type).toBe("object");
    expect(GRADE_SCHEMA.required).toEqual(["grades"]);
    expect(GRADE_SCHEMA.additionalProperties).toBe(false);
    expect(GRADE_SCHEMA.properties.grades.type).toBe("array");
    expect(GRADE_SCHEMA.properties.grades.items.required).toEqual([
      "id",
      "passed",
      "reasoning",
    ]);
    expect(GRADE_SCHEMA.properties.grades.items.additionalProperties).toBe(false);
  });
});

describe("parseJudgeGrades", () => {
  test("accepts a valid structured grades object", () => {
    expectMapped(load("valid-grades.json"));
  });

  test("reads grades from a Messages API success envelope", () => {
    expectMapped(load("messages-success.json"));
  });

  test("reads structured_output from a claude -p envelope", () => {
    expectMapped(load("cli-structured-output.json"));
  });

  test("maps a missing assertion id to passed:false", () => {
    const raw = JSON.stringify({
      grades: [
        { id: "has-verdict", passed: true, reasoning: "ok" },
      ],
    });
    const grades = parseJudgeGrades(raw, assertions);
    expect(grades[1]).toEqual({
      id: "no-password-collection",
      text: "Does not collect passwords",
      passed: false,
      reasoning: "missing",
    });
  });

  test("throws GradeParseError on empty reply", () => {
    expect(() => parseJudgeGrades(load("empty.json"), assertions)).toThrow(GradeParseError);
    try {
      parseJudgeGrades("", assertions);
    } catch (err) {
      expect(err).toBeInstanceOf(GradeParseError);
      expect((err as GradeParseError).message).toMatch(/empty/i);
      expect((err as GradeParseError).raw).toBe("");
    }
  });

  test("throws GradeParseError on a refusal envelope", () => {
    const raw = load("refusal.json");
    expect(() => parseJudgeGrades(raw, assertions)).toThrow(GradeParseError);
    try {
      parseJudgeGrades(raw, assertions);
    } catch (err) {
      expect(err).toBeInstanceOf(GradeParseError);
      expect((err as GradeParseError).message).toMatch(/refusal/);
      expect((err as GradeParseError).raw).toBe(raw);
    }
  });

  test("throws GradeParseError on a max_tokens cut that misses the object", () => {
    const raw = load("max-tokens-cut.json");
    expect(() => parseJudgeGrades(raw, assertions)).toThrow(GradeParseError);
    try {
      parseJudgeGrades(raw, assertions);
    } catch (err) {
      expect(err).toBeInstanceOf(GradeParseError);
      expect((err as GradeParseError).message).toMatch(/max_tokens/);
      expect((err as GradeParseError).raw).toBe(raw);
    }
  });

  test("does not scrape a free-text JSON array", () => {
    const raw = load("bare-array.json");
    expect(() => parseJudgeGrades(raw, assertions)).toThrow(GradeParseError);
    try {
      parseJudgeGrades(raw, assertions);
    } catch (err) {
      expect(err).toBeInstanceOf(GradeParseError);
      expect((err as GradeParseError).message).toMatch(/grades/);
    }
  });

  test("throws GradeParseError on prose", () => {
    expect(() => parseJudgeGrades("I decline to grade this.", assertions)).toThrow(GradeParseError);
  });
});
