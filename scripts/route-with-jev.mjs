#!/usr/bin/env node
/**
 * Optional semantic router via Vercel AI Gateway + typesafe-ai/jev.
 * stdin JSON: { "prompt": "...", "entries": [ {id, kind, hint}, ... ] }
 * stdout JSON: { "id": "plugin:name"|"NONE", "source": "jev" }
 * Exit 0 always on logical miss; non-zero only for programmer errors.
 * Missing AI_GATEWAY_API_KEY → exit 0 + {"id":null,"source":"skipped"}
 */
import { readFileSync } from 'fs';

const raw = readFileSync(0, 'utf8');
const { prompt, entries } = JSON.parse(raw);

if (!process.env.AI_GATEWAY_API_KEY) {
  process.stdout.write(JSON.stringify({ id: null, source: 'skipped' }) + '\n');
  process.exit(0);
}

if (!prompt || !Array.isArray(entries) || entries.length === 0 || entries.length > 255) {
  process.stdout.write(JSON.stringify({ id: null, source: 'skipped', reason: 'bad-input-or-oversize' }) + '\n');
  process.exit(0);
}

const criteria = Object.fromEntries(
  entries.map((e) => [e.id, `${e.kind}: ${e.hint || e.id}`]),
);
criteria.NONE = 'No installed skill or agent is a good fit; handle in the main session.';

try {
  const { experimental_evaluate: evaluate } = await import('ai');
  const result = await evaluate({
    model: 'typesafe-ai/jev',
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
  const choice = result.answers?.route?.choice ?? 'NONE';
  const id = choice === 'NONE' || !criteria[choice] ? null : choice;
  process.stdout.write(JSON.stringify({ id, source: 'jev', choice }) + '\n');
} catch (err) {
  process.stdout.write(
    JSON.stringify({
      id: null,
      source: 'error',
      error: String(err?.message || err).slice(0, 200),
    }) + '\n',
  );
  process.exit(0); // continue via keyword scorer
}
