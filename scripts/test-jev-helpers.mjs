#!/usr/bin/env node
// npm install --prefix /tmp/bopen-jev-test --no-save --ignore-scripts ai@7.0.105
// BOPEN_JEV_TEST_SDK_PREFIX=/tmp/bopen-jev-test node scripts/test-jev-helpers.mjs
// Uses the real SDK with intercepted fetch: no credentials or network calls.
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = process.env.BOPEN_JEV_TEST_SDK_PREFIX || join(homedir(), '.cache/bopen-jev');
const require = createRequire(join(resolve(prefix), 'package.json'));
assert.equal(require('ai/package.json').version, '7.0.105', 'Install the tested ai@7.0.105 SDK first');
const temp = mkdtempSync(join(tmpdir(), 'jev-helpers-'));
try {
  const cache = join(temp, '.cache/bopen-jev');
  mkdirSync(cache, { recursive: true });
  symlinkSync(join(resolve(prefix), 'node_modules'), join(cache, 'node_modules'), 'dir');
  const preload = join(temp, 'transport.mjs');
  writeFileSync(preload, `
import assert from 'node:assert/strict';
const mode = process.env.JEV_TEST_MODE;
const kind = process.env.JEV_TEST_KIND;
const timeout = AbortSignal.timeout.bind(AbortSignal);
AbortSignal.timeout = ms => {
  assert.equal(ms, kind === 'route' ? 3000 : 10000);
  return timeout(mode === 'timeout' ? 20 : ms);
};
globalThis.fetch = async (url, request) => {
  assert.equal(String(url), 'https://ai-gateway.vercel.sh/v4/ai/evaluation-model');
  assert.equal(request.headers['ai-model-id'], 'typesafe-ai/jev');
  assert.ok(request.signal);
  const body = JSON.parse(request.body);
  assert.equal(typeof body.state, 'string');
  assert.equal(body.questions[kind === 'route' ? 'route' : 'winner'].type, 'choice');
  if (kind === 'lens') assert.deepEqual(body.questions.strength.criteria, ['weak', 'lean', 'clear', 'decisive']);
  if (mode === 'error') throw new Error('SECRET request data must never appear in output');
  if (mode === 'timeout') {
    return await new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout was not passed to transport')), 1000);
      request.signal.addEventListener('abort', () => { clearTimeout(timer); reject(request.signal.reason); }, { once: true });
    });
  }
  let choice = mode === 'none' ? 'NONE' : mode === 'unknown' ? 'missing:id' : kind === 'route' ? 'skill:test:alpha' : 'test:alpha';
  const answer = { type: 'choice', choice };
  let answers = kind === 'route' ? { route: answer } : { winner: answer, strength: { type: 'score', score: mode === 'bad-score' ? 4 : 2.5 } };
  if (mode === 'missing') answers = {};
  if (mode === 'wrong-type') answers[kind === 'route' ? 'route' : 'winner'] = { type: 'score', score: 2 };
  return new Response(JSON.stringify({ answers }), { headers: { 'content-type': 'application/json' } });
};
`);
  const inputs = {
    route: { prompt: 'Choose the right skill', entries: [{ id: 'test:alpha', kind: 'skill', hint: 'Choose a skill' }] },
    lens: { lens: 'simplicity', problem: 'Choose the simplest option', options: { 'test:alpha': 'Reuse', 'test:beta': 'Rebuild' } },
  };
  const sources = {
    route: 'scripts/route-with-jev.mjs',
    lens: 'modules/review/skills/visual-proposal/scripts/lens-score-jev.mjs',
  };
  for (const [kind, source] of Object.entries(sources)) {
    // Separate extracted plugin roots, with no source repository node_modules.
    const script = join(temp, kind, 'helper.mjs');
    mkdirSync(dirname(script));
    copyFileSync(join(root, source), script);
    function run(mode, input = inputs[kind], key = 'test-key') {
      const result = spawnSync(process.execPath, ['--import', preload, script], {
        input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 5000,
        env: { ...process.env, HOME: temp, AI_GATEWAY_API_KEY: key, JEV_TEST_KIND: kind, JEV_TEST_MODE: mode, NODE_OPTIONS: '' },
      });
      assert.equal(result.status, 0, result.stderr || String(result.error));
      assert.equal(result.stderr, '');
      assert.ok(!result.stdout.includes('SECRET'));
      return JSON.parse(result.stdout);
    }
    const success = run('success');
    assert.equal(success.source, 'jev', JSON.stringify(success));
    assert.equal(success[kind === 'route' ? 'id' : 'winner'], 'test:alpha');
    if (kind === 'lens') assert.equal(success.score, 2.5);
    else {
      assert.deepEqual(run('none'), { id: null, source: 'jev', choice: 'NONE' });
      const collision = run('success', { ...inputs.route, entries: [
        { id: 'test:alpha', kind: 'agent' }, ...inputs.route.entries,
      ] });
      assert.equal(collision.source, 'jev');
      assert.equal(collision.kind, 'skill');
      assert.equal(collision.id, 'test:alpha');
    }
    for (const mode of ['unknown', 'missing', 'wrong-type', 'error', 'timeout', ...(kind === 'lens' ? ['bad-score'] : [])]) {
      assert.equal(run(mode).source, 'error', kind + ':' + mode);
    }
    assert.equal(run('success', '{', '').source, 'skipped');
    for (const malformed of ['{', 'null', '{}', '[]']) assert.equal(run('success', malformed).source, 'error');
    const invalid = kind === 'route'
      ? [{ ...inputs.route, entries: [null] }, { ...inputs.route, entries: [{ id: 'NONE', kind: 'skill' }] }, { ...inputs.route, entries: [inputs.route.entries[0], inputs.route.entries[0]] }, { ...inputs.route, prompt: 1 }]
      : [{ ...inputs.lens, options: ['one', 'two'] }, { ...inputs.lens, options: 'ab' }, { ...inputs.lens, advocacy: {} }, { ...inputs.lens, options: { a: 1, b: 2 } }];
    for (const input of invalid) assert.equal(run('success', input).source, 'error');
  }
  console.log('Jev helpers: real SDK request/answer contract, extracted installs, malformed input, sanitized errors, and timeouts pass.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
