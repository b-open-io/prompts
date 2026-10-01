#!/usr/bin/env python3
"""Compare the actual routing hook with/without Jev on frozen synthetic cases.

Requires the documented Jev runtime and AI_GATEWAY_API_KEY. Makes paid calls.
Example: python3 scripts/benchmark-jev-routing.py --output /tmp/jev-run
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import math
import random
import statistics
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def summarize(folder, cases):
    rows = [json.loads(line) for line in (folder/'results.jsonl').read_text().splitlines()]
    meta = json.loads((folder/'metadata.json').read_text())
    expected = {(c['id'], repeat, arm) for c in cases
                for repeat in range(1, meta['repeats']+1) for arm in ['keyword', 'jev']}
    assert len(rows) == len(expected) and {(r['case_id'], r['repeat'], r['arm']) for r in rows} == expected, 'Incomplete or duplicate results'
    acceptable = {c['id']: c['acceptable'] for c in cases}
    for row in rows:
        row['correct'] = not row['error'] and row['prediction'] in acceptable[row['case_id']]
    summary = {}
    for arm in ['keyword', 'jev']:
        records = [r for r in rows if r['arm'] == arm]
        times = sorted(r['latency_ms'] for r in records)
        summary[arm] = {'correct': sum(r['correct'] for r in records), 'trials': len(records),
            'accuracy': statistics.mean(r['correct'] for r in records),
            'p50_ms': statistics.median(times), 'p95_ms': times[math.ceil(.95*len(times))-1],
            'max_ms': max(times), 'hook_errors': sum(bool(r['error']) for r in records),
            'top2_hits': sum(not r['error'] and any(label in acceptable[r['case_id']] for label in (r['suggestions'] or ['NONE'])) for r in records),
            'categories': {}}
        for category in sorted({c['category'] for c in cases}):
            selected = [r for r in records if r['category'] == category]
            summary[arm]['categories'][category] = {'correct': sum(r['correct'] for r in selected), 'trials': len(selected)}
        if arm == 'jev':
            summary[arm]['fallbacks'] = sum((r['helper'] or {}).get('source') != 'jev' for r in records)
    # Resample whole prompts, keeping all repeated trials paired.
    deltas = [statistics.mean(r['correct'] for r in rows if r['case_id'] == c['id'] and r['arm'] == 'jev') -
              statistics.mean(r['correct'] for r in rows if r['case_id'] == c['id'] and r['arm'] == 'keyword') for c in cases]
    rng = random.Random(4929)
    draws = sorted(statistics.mean(rng.choices(deltas, k=len(deltas))) for _ in range(10000))
    summary.update(paired_lift=statistics.mean(deltas), prompt_cluster_bootstrap_95=[draws[249], draws[9749]], bootstrap_seed=4929, bootstrap_draws=10000)
    (folder/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cases', type=Path, default=ROOT / 'benchmarks/fixtures/jev-routing-cases.json')
    parser.add_argument('--index', type=Path, default=ROOT / 'benchmarks/fixtures/jev-router-index-2026-09-17.json')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--repeats', type=int, default=3)
    parser.add_argument('--concurrency', type=int, default=3)
    parser.add_argument('--summarize-only', action='store_true', help='Rescore an existing run without API calls')
    args = parser.parse_args()
    if args.summarize_only:
        print(json.dumps(summarize(args.output, json.loads(args.cases.read_text())['cases']), indent=2))
        return
    if not os.environ.get('AI_GATEWAY_API_KEY'):
        parser.error('AI_GATEWAY_API_KEY is required; no key values are recorded')
    if not 1 <= args.repeats <= 10 or not 1 <= args.concurrency <= 4:
        parser.error('repeats must be 1..10 and concurrency 1..4')
    cases = json.loads(args.cases.read_text())['cases']
    entries = json.loads(args.index.read_text())['entries']
    labels = {f"{e['kind']}:{e['id']}" for e in entries} | {'NONE'}
    assert len({c['id'] for c in cases}) == len(cases)
    assert all(c['acceptable'] and set(c['acceptable']) <= labels for c in cases)
    args.output.mkdir(parents=True, exist_ok=False)
    meta = {'started_at': datetime.now(timezone.utc).isoformat(), 'cases': len(cases),
            'catalog_entries': len(entries), 'repeats': args.repeats, 'concurrency': args.concurrency,
            'model': 'typesafe-ai/jev', 'sdk': 'ai@7.0.105', 'cost_usd': None,
            'cost_note': 'The production helper does not expose billing telemetry; unknown is not zero.',
            'git_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
            'sha256': {str(p.relative_to(ROOT)): digest(p) for p in
                       [args.cases, args.index, ROOT/'scripts/route-with-jev.mjs', ROOT/'hooks/prompt-router.sh']},
            'acceptance': {'positive_accuracy_min': 0.85, 'must_not_regress_baseline': True,
                           'negative_false_positives_max': 0, 'fallback_rate_max': 0.05,
                           'hook_p95_ms_max': 3500},
            'sampling': 'Synthetic fixed prompts; fresh isolated session for each trial. Labels frozen before outputs. Repeats do not increase independent prompt count.'}
    (args.output/'metadata.json').write_text(json.dumps(meta, indent=2)+'\n')
    with tempfile.TemporaryDirectory(prefix='jev-benchmark-') as scratch:
        temp = Path(scratch)
        config = temp/'config.json'; config.write_text('{"hooks":{"prompt-router":true}}')
        wrapper = temp/'trace.mjs'
        wrapper.write_text("import { appendFileSync } from 'node:fs';\n"+
            "const original = process.stdout.write.bind(process.stdout);\n"+
            "process.stdout.write = (chunk, ...args) => { appendFileSync(process.env.JEV_TRACE, chunk); return original(chunk, ...args); };\n"+
            f"await import({json.dumps((ROOT/'scripts/route-with-jev.mjs').as_uri())});\n")
        def trial(case, repeat):
            rows = []
            # Alternate order to reduce systematic warm-up effects.
            for arm in (['keyword', 'jev'] if repeat % 2 == 0 else ['jev', 'keyword']):
                session = f"{case['id']}-{repeat}-{arm}"
                trace = temp/f'{session}.json'
                env = {**os.environ, 'BOPEN_HOOK_RUNTIME': 'claude', 'BOPEN_HOOKS_CONFIG': str(config),
                       'BOPEN_ROUTER_INDEX': str(args.index.resolve()), 'BOPEN_ROUTER_STATE_DIR': str(temp/'state'),
                       'BOPEN_JEV_ROUTER': str(wrapper), 'JEV_TRACE': str(trace), 'CLAUDE_PLUGIN_ROOT': str(ROOT)}
                if arm == 'keyword': env.pop('AI_GATEWAY_API_KEY', None)
                started = time.perf_counter()
                try:
                    proc = subprocess.run(['bash', str(ROOT/'hooks/prompt-router.sh')],
                        input=json.dumps({'prompt': case['prompt'], 'session_id': session}),
                        text=True, capture_output=True, env=env, timeout=8)
                    context = json.loads(proc.stdout)['hookSpecificOutput']['additionalContext'] if proc.stdout.strip() else ''
                    observed = re.findall(r'Skill\(([^)]+)\)|subagent_type ([\w:-]+)', context)
                    predictions = list(dict.fromkeys('skill:'+a if a else 'agent:'+b for a,b in observed))
                    helper = json.loads(trace.read_text()) if trace.exists() else None
                    error = 'hook-error' if proc.returncode or proc.stderr else None
                except (subprocess.TimeoutExpired, ValueError, KeyError):
                    predictions, helper, error = [], None, 'hook-or-output-error'
                row = {'case_id': case['id'], 'category': case['category'], 'repeat': repeat+1, 'arm': arm,
                       'prediction': predictions[0] if predictions else 'NONE', 'suggestions': predictions,
                       'helper': helper, 'error': error, 'latency_ms': round((time.perf_counter()-started)*1000, 3)}
                row['correct'] = not error and row['prediction'] in case['acceptable']
                rows.append(row)
            return rows
        with (args.output/'results.jsonl').open('w') as output, ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            jobs = [pool.submit(trial, c, r) for r in range(args.repeats) for c in cases]
            for i, job in enumerate(as_completed(jobs), 1):
                for row in job.result(): output.write(json.dumps(row)+'\n')
                output.flush()
                if i % 8 == 0: print(f'{i}/{len(jobs)} paired trials recorded', flush=True)
    summarize(args.output, cases)
    print(args.output, flush=True)

if __name__ == '__main__':
    main()
