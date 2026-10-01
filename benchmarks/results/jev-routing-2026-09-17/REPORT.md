# Jev skill-routing pilot — September 17, 2026

The corrected Jev-assisted routing hook chose the expected first resource in
**94/96 trials (97.9%)**, compared with **69/96 (71.9%)** for the unchanged keyword
path: **+26.0 percentage points**. It recovered 25 of the baseline's 27 misses
and introduced no regressions on this set. This is a synthetic routing pilot,
not measured production accuracy or evidence about eventual task completion.

**Reliability did not clear the predeclared gate:** 8/96 Jev attempts returned
an error and used the keyword fallback (8.3%, above the 5% limit). Keep the
classifier optional while investigating these failures and gathering broader
held-out evidence.

## What was tested

- 32 distinct prompts, each run three times: 16 ordinary skill requests,
  eight boundary/paraphrase requests, eight out-of-catalog negatives.
- A frozen snapshot of the installed catalog: 228 entries, comprising skills
  and agents. Both arms saw the same catalog; positive labels prefer the most
  specific skill rather than a generic parent agent.
- Actual `hooks/prompt-router.sh` in both arms, with a fresh isolated session
  for every trial. The baseline unsets the Gateway key; the treatment enables
  the corrected Jev helper and retains the production fallback behavior.
- Live Vercel AI Gateway `typesafe-ai/jev` through `ai@7.0.105`, three concurrent
  paired trials, alternating arm order between repeats. No SDK mocks were used.
- A separate agent authored prompts and labels from catalog descriptions before
  seeing the classifier implementation or outputs. Labels were not adjusted
  after scoring. These are synthetic, catalog-informed cases, not user traffic.
- Acceptance criteria were recorded before calls: at least 85% positive
  accuracy, no baseline regression, zero negative false positives, at most 5%
  fallbacks, and hook p95 at most 3.5 seconds.

The fixture contains public catalog descriptions and invented tasks. The post
URL, account handle, and customer name are placeholders; classification did not
fetch posts, create invoices, or execute any selected workflow.

## Results

| Metric | Keywords | Jev-assisted hook |
|---|---:|---:|
| Correct first choice, all trials | 69/96 (71.9%) | 94/96 (97.9%) |
| Correct first choice, positive tasks | 45/72 (62.5%) | 70/72 (97.2%) |
| Ordinary skill requests | 33/48 (68.8%) | 46/48 (95.8%) |
| Boundary/paraphrase requests | 12/24 (50.0%) | 24/24 (100%) |
| Correct abstentions on negatives | 24/24 | 24/24 |
| Expected label among returned suggestions | 81/96 (84.4%) | 95/96 (99.0%) |
| Median total hook latency | 101.5 ms | 511.8 ms |
| p95 total hook latency | 113.8 ms | 3,168.6 ms |
| Maximum total hook latency | 132.5 ms | 3,188.1 ms |
| Jev errors requiring keyword fallback | — | 8/96 (8.3%) |
| Hook execution/output errors | 0 | 0 |

The primary metric is first-choice accuracy. The keyword path may suggest two
resources, while successful Jev calls return one; the suggestion-coverage row
shows the baseline's additional opportunity rather than hiding it.

Of 96 Jev attempts, 88 returned valid model decisions and all 88 matched the
frozen labels. Eight returned errors; fallback classified six correctly and
missed two. Thus **88/96 attempts (91.7%) produced a correct model decision
without fallback**. The 97.9% headline measures the complete assisted hook,
including its fallback, not Jev alone.

The error trials took 3.16–3.19 seconds, consistent with the helper's three-second
request deadline. Errors were clustered around the end of repeat one and start
of repeat two. The helper intentionally sanitizes error details, so this run
cannot establish whether the underlying cause was provider latency, transport,
or another evaluation failure. Increasing the deadline was not tested.

Median added latency was 410.3 ms. Dollar cost and token counts are **unknown**:
the production helper does not expose billing telemetry. This report makes no
claim of cost savings.

## Cases improved

Counts are correct first choices across the three repeats.

| Case | Expected skill | Baseline selection | Keywords | Assisted |
|---|---|---|---:|---:|
| ordinary-01 | research:x-tweet-fetch | No hint | 0/3 | 2/3 |
| ordinary-06 | 1sat:opns | 1sat:ordinals agent | 0/3 | 2/3 |
| ordinary-09 | creative:cli-demo-gif | 1sat:cli | 0/3 | 3/3 |
| ordinary-11 | research:notebooklm | No hint | 0/3 | 3/3 |
| ordinary-14 | mcp-dev:json-render-react-native | mcp-dev:json-render-react-email | 0/3 | 3/3 |
| boundary-01 | research:x-user-timeline | No hint | 0/3 | 3/3 |
| boundary-02 | sigma-auth:device-authorization | plugin-kit:prompt-engineer agent | 0/3 | 3/3 |
| boundary-05 | scribe:project | scribe:invoice | 0/3 | 3/3 |
| boundary-06 | gemskills:edit-image | No hint | 0/3 | 3/3 |

All other 23 prompts remained correct in all repeats. The two remaining misses
were fallback trials, not wrong completed Jev decisions.

## Blocker found before measurement

Staging commit `23120db496fd7aabdd0147cc81f7516d13d87954` rejects repeated resource
IDs. The installed catalog legitimately contains both the **agent** and **skill**
`core:front-desk`. A probe with all 228 entries returned `evaluation-unavailable`
in 44.9 ms, before an API request. Therefore that uncorrected implementation
cannot provide semantic routing with this catalog, regardless of prompt.

The candidate uses `kind:id` as the internal choice label, returns the resource
kind, and matches both kind and id in the hook. Regression checks cover a shared
id across kinds and still reject duplicates within a kind. The live metrics
above apply to that corrected candidate, not the earlier staging commit.

## Confidence and limits

A paired bootstrap over **32 prompt clusters**, preserving all three repeats
per prompt, gives a 95% interval of **+11.5 to +41.7 percentage points** for the
lift on this prompt distribution (10,000 draws, seed 4929). The 96 attempts are
not 96 independent prompts. The interval describes resampling this small suite;
it does not make the purposive sample representative of production traffic.

The suite does not measure actual skill invocation, task completion, full
conversation routing, session deduplication over time, catalogs over 255 entries,
agent-target accuracy, or adversarial routing. Labels prefer specific skills and
have not undergone independent adjudication. The author did not inspect outputs,
but authored from the same catalog descriptions visible to the classifier.

Before claiming production improvement, use a consented and scrubbed traffic
sample with frozen labels, broaden ambiguous and negative cases, repeat across
days, investigate the fallback burst, and collect billing telemetry. The current
quality result is promising; the reliability gate remains unmet.

## Reproduce and inspect

From the repository root, with Node 22+ and the documented optional SDK installed:

```bash
# Live run: incurs Gateway usage; set AI_GATEWAY_API_KEY in the environment.
python3 scripts/benchmark-jev-routing.py --output /tmp/jev-routing-new

# Recalculate this report's metrics with no API calls.
python3 scripts/benchmark-jev-routing.py \
  --output benchmarks/results/jev-routing-2026-09-17 --summarize-only

# Regression tests: real SDK, intercepted HTTP, no paid calls.
node scripts/test-jev-helpers.mjs
bash hooks/tests/run-tests.sh
```

- [Frozen prompts and labels](../../fixtures/jev-routing-cases.json)
- [Frozen installed catalog](../../fixtures/jev-router-index-2026-09-17.json)
- [Raw paired trials](results.jsonl)
- [Run metadata and classifier hashes](metadata.json)
- [Calculated metrics](summary.json)
- [Original staging probe](as-staged-probe.json)
