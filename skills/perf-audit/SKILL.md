---
name: perf-audit
description: "Run local performance audits on a project without network calls. This skill should be used when the user says 'audit performance', 'check bundle size', 'find large images', 'check for heavy dependencies', 'run a perf audit', 'how big is my bundle', 'optimize images', 'find oversized assets', or before any performance optimization work. Also use when an agent needs baseline metrics before making changes. All scripts output structured JSON to stdout."
---

# Performance Audit

Run local, deterministic performance audits. All scripts output JSON to stdout, use only standard unix tools, and make zero network calls.

## Scripts

### Full Audit (start here)

Runs all audits in parallel and produces a unified report with a health score (0-100).

```bash
bash <skill-path>/scripts/full-audit.sh /path/to/project
```

Returns:
```json
{
  "health_score": 85,
  "image_audit": { ... },
  "bundle_audit": { ... },
  "dep_audit": { ... }
}
```

### Image Audit

Scan for oversized images, missing next-gen formats, and dimension info.

```bash
bash <skill-path>/scripts/image-audit.sh /path/to/project
```

Flags images over 500KB as oversized. Uses `sips` on macOS for dimensions. Reports images without a WebP/AVIF equivalent.

### Bundle Audit

Analyze JS and CSS bundle sizes in build output directories (.next, dist, build, out).

```bash
bash <skill-path>/scripts/bundle-audit.sh /path/to/project
```

Reports raw and gzipped sizes for every bundle file. Flags source maps in production. Requires a build to exist -- run the project's build command first if no build output is found.

### Dependency Audit

Check package.json for known-heavy dependencies and suggest lighter alternatives.

```bash
bash <skill-path>/scripts/dep-audit.sh /path/to/project
```

Checks against a curated list of heavy packages (moment, lodash, jquery, full icon libraries, etc.) and suggests tree-shakable or lighter replacements.

## Workflow

1. Run `full-audit.sh` to get the baseline health score
2. Review each sub-audit for specific issues
3. Fix issues (optimize images, swap deps, configure tree-shaking)
4. Re-run `full-audit.sh` to measure improvement
5. Include before/after scores in your completion report
