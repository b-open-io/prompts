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
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.AI_GATEWAY_API_KEY) {
  process.stdout.write(JSON.stringify({ source: 'skipped' }) + '\n');
  process.exit(0);
}

try {
  const { lens, problem, options, advocacy } = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof lens !== 'string' || !lens.trim() || typeof problem !== 'string' || !problem.trim() ||
      !options || typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).length < 2 || Object.keys(options).length > 256 ||
      Object.entries(options).some(([id, description]) => !id || typeof description !== 'string') ||
      (advocacy != null && typeof advocacy !== 'string')) {
    throw new Error('Invalid input');
  }
  let { experimental_evaluate: evaluate } = await import('ai').catch(() => ({}));
  if (typeof evaluate !== 'function') {
    // Review is installed independently of core and the invoking project.
    const require = createRequire(join(homedir(), '.cache/bopen-jev/package.json'));
    ({ experimental_evaluate: evaluate } = await import(pathToFileURL(require.resolve('ai')).href));
  }
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(10000),
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
        instructions: `How decisively does the strongest option beat the alternatives under "${lens}"?`,
        criteria: ['weak', 'lean', 'clear', 'decisive'],
      },
    },
  });
  const winner = result.answers?.winner?.choice;
  const score = result.answers?.strength?.score;
  if (typeof winner !== 'string' || !Object.hasOwn(options, winner) ||
      !Number.isFinite(score) || score < 0 || score > 3) throw new Error('Invalid answer');
  process.stdout.write(
    JSON.stringify({
      source: 'jev',
      attribution: 'scored by jev',
      lens,
      winner,
      score,
    }) + '\n',
  );
} catch {
  process.stdout.write(
    JSON.stringify({ source: 'error', error: 'evaluation-unavailable' }) + '\n',
  );
  process.exit(0);
}
