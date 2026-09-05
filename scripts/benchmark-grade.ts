/**
 * Structured judge grades for the skill benchmark harness.
 *
 * The judge is locked to GRADE_SCHEMA (root object, not a bare array).
 * Callers must not regex-scrape a free-text JSON array.
 */

export interface GradeAssertion {
  id: string;
  text: string;
}

export interface AssertionResult {
  id: string;
  text: string;
  passed: boolean;
  reasoning: string;
}

export const GRADE_SCHEMA = {
  type: "object",
  properties: {
    grades: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          passed: { type: "boolean" },
          reasoning: { type: "string" },
        },
        required: ["id", "passed", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["grades"],
  additionalProperties: false,
} as const;

export class GradeParseError extends Error {
  readonly raw: string;
  constructor(message: string, raw: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GradeParseError";
    this.raw = raw;
  }
}

/** CLI judge non-zero exit — same inspectable-raw shape as a bad Messages HTTP body. */
export function judgeCliExitError(exitCode: number, stderr: string): GradeParseError {
  return new GradeParseError(
    `claude judge exited ${exitCode}: ${stderr.slice(0, 400)}`,
    stderr,
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function looksLikeGrade(v: unknown): v is { id: string; passed?: boolean; reasoning?: string } {
  return isRecord(v) && typeof v.id === "string";
}

function asGradeObject(v: unknown): { grades: unknown[] } | null {
  if (!isRecord(v) || !Array.isArray(v.grades)) return null;
  return { grades: v.grades };
}

function textFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is { type: string; text: string } =>
      isRecord(b) && b.type === "text" && typeof b.text === "string")
    .map(b => b.text)
    .join("");
}

/** Pull `{grades:[...]}` out of a bare object, Messages API message, or CLI envelope. */
export function unwrapJudgePayload(parsed: unknown): { grades: unknown[] } | null {
  const direct = asGradeObject(parsed);
  if (direct) return direct;

  if (isRecord(parsed) && "structured_output" in parsed) {
    return asGradeObject(parsed.structured_output);
  }

  if (isRecord(parsed) && Array.isArray(parsed.content)) {
    const text = textFromContent(parsed.content).trim();
    if (!text) return null;
    try {
      return asGradeObject(JSON.parse(text));
    } catch {
      return null;
    }
  }

  return null;
}

function stopReason(parsed: unknown): string | undefined {
  if (!isRecord(parsed) || typeof parsed.stop_reason !== "string") return undefined;
  return parsed.stop_reason;
}

function mapGrades(grades: unknown[], assertions: GradeAssertion[]): AssertionResult[] {
  return assertions.map(a => {
    const grade = grades.filter(looksLikeGrade).find(g => g.id === a.id);
    return {
      id: a.id,
      text: a.text,
      passed: grade?.passed ?? false,
      reasoning: grade?.reasoning ?? "missing",
    };
  });
}

/** Parse a structured judge reply into assertion grades. Throws GradeParseError on miss. */
export function parseJudgeGrades(raw: string, assertions: GradeAssertion[]): AssertionResult[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new GradeParseError("empty judge reply", raw);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new GradeParseError(
      `judge reply is not JSON: ${err instanceof Error ? err.message : String(err)}`,
      raw,
      err instanceof Error ? { cause: err } : undefined,
    );
  }

  const reason = stopReason(parsed);
  if (reason === "refusal") {
    throw new GradeParseError("judge refused (stop_reason=refusal)", raw);
  }

  const payload = unwrapJudgePayload(parsed);
  if (!payload || !payload.grades.some(looksLikeGrade)) {
    const detail = reason === "max_tokens"
      ? "judge reply cut off (stop_reason=max_tokens); no grades object"
      : "no {grades:[{id, passed, reasoning}]} object in judge reply";
    throw new GradeParseError(detail, raw);
  }

  return mapGrades(payload.grades, assertions);
}

export function judgePrompt(
  output: string,
  expectedOutput: string,
  assertions: GradeAssertion[],
): string {
  return `You are a strict evaluator. Grade whether the OUTPUT satisfies each assertion.

EXPECTED OUTPUT DESCRIPTION:
${expectedOutput}

ACTUAL OUTPUT:
${output.slice(0, 8000)}

ASSERTIONS:
${assertions.map((a, i) => `${i + 1}. [${a.id}] ${a.text}`).join("\n")}

Return a JSON object {"grades":[...]} matching the schema. Each grades element: {"id":"...","passed":true/false,"reasoning":"one sentence"}`;
}
