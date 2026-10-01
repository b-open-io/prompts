#!/usr/bin/env node
/**
 * Optional semantic router via Vercel AI Gateway + typesafe-ai/jev.
 * stdin JSON: { "prompt": "...", "entries": [ {id, kind, hint}, ... ] }
 * stdout JSON: { "id": "plugin:name"|null, "source": "jev" }
 * Exit 0 always on logical miss; non-zero only for programmer errors.
 * Missing AI_GATEWAY_API_KEY → exit 0 + {"id":null,"source":"skipped"}
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.AI_GATEWAY_API_KEY) {
  process.stdout.write(JSON.stringify({ id: null, source: 'skipped' }) + '\n');
  process.exit(0);
}

try {
  const { prompt, entries } = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof prompt !== 'string' || !prompt.trim() || !Array.isArray(entries) ||
      entries.length === 0 || entries.length > 255 ||
      entries.some(e => !e || typeof e.id !== 'string' || !e.id || e.id === 'NONE' ||
        typeof e.kind !== 'string' || (e.hint != null && typeof e.hint !== 'string')) ||
      new Set(entries.map(e => `${e.kind}:${e.id}`)).size !== entries.length) {
    throw new Error('Invalid input');
  }
  const choices = Object.fromEntries(entries.map(e => [`${e.kind}:${e.id}`, e]));
  const criteria = Object.fromEntries(Object.entries(choices).map(([label, e]) => [label, `${e.kind}: ${e.hint || e.id}`]));
  criteria.NONE = 'No installed skill or agent is a good fit; handle in the main session.';
  let { experimental_evaluate: evaluate } = await import('ai').catch(() => ({}));
  if (typeof evaluate !== 'function') {
    // Installed plugins do not inherit the invoking project's node_modules.
    const require = createRequire(join(homedir(), '.cache/bopen-jev/package.json'));
    ({ experimental_evaluate: evaluate } = await import(pathToFileURL(require.resolve('ai')).href));
  }
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(3000),
    state: `Route this user prompt to at most one catalog entry.\n\nPrompt:\n${prompt}`,
    questions: {
      route: {
        type: 'choice',
        instructions:
          'Pick the single best matching skill or agent id from the criteria, or NONE.',
        criteria,
      },
    },
  });
  const choice = result.answers?.route?.choice;
  if (typeof choice !== 'string' || !Object.hasOwn(criteria, choice)) throw new Error('Invalid answer');
  const selected = choices[choice];
  const id = selected?.id ?? null;
  process.stdout.write(JSON.stringify({ id, ...(selected ? { kind: selected.kind } : {}), source: 'jev', choice }) + '\n');
} catch {
  process.stdout.write(
    JSON.stringify({
      id: null,
      source: 'error',
      error: 'evaluation-unavailable',
    }) + '\n',
  );
  process.exit(0); // continue via keyword scorer
}
