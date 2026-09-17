#!/usr/bin/env node
/**
 * Optional per-lens score/choice for visual-proposal judging bench.
 * stdin JSON: {
 *   lens: "efficiency/simplicity",
 *   problem: "...",
 *   options: { "opt-a": "label A", "opt-b": "label B" },
 *   advocacy: "short shared record..."
 * }
 * stdout: { winner, score, source: "jev"|"skipped"|"error", attribution: "scored by jev" }
 */
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { lens, problem, options, advocacy } = input;

if (!process.env.AI_GATEWAY_API_KEY || !options || Object.keys(options).length < 2) {
  process.stdout.write(JSON.stringify({ source: 'skipped' }) + '\n');
  process.exit(0);
}

try {
  const { experimental_evaluate: evaluate } = await import('ai');
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    state: [
      `Judging lens: ${lens}`,
      `Problem: ${problem}`,
      `Advocacy record:\n${advocacy || '(none)'}`,
    ].join('\n\n'),
    questions: {
      winner: {
        type: 'choice',
        instructions: `Under the lens "${lens}", which option wins? No ties.`,
        criteria: options,
      },
      strength: {
        type: 'score',
        instructions: `How decisive is that win under "${lens}"?`,
        criteria: ['weak', 'lean', 'clear', 'decisive'],
      },
    },
  });
  process.stdout.write(
    JSON.stringify({
      source: 'jev',
      attribution: 'scored by jev',
      lens,
      winner: result.answers?.winner?.choice ?? null,
      score: result.answers?.strength?.score ?? null,
    }) + '\n',
  );
} catch (err) {
  process.stdout.write(
    JSON.stringify({ source: 'error', error: String(err?.message || err).slice(0, 200) }) + '\n',
  );
  process.exit(0);
}
