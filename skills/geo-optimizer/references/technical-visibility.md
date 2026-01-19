# Technical Visibility for AI Crawlers

Understanding how LLM crawlers access and process web content.

## AI Crawler Landscape

Unlike traditional search engines, AI crawlers have diverse behaviors:

| Crawler | Renders JS | Size Limit | User-Agent |
|---------|------------|------------|------------|
| GPTBot | Yes | ~1MB | GPTBot |
| ClaudeBot | No | Unknown | ClaudeBot |
| PerplexityBot | Sometimes | ~1MB | PerplexityBot |
| Google-Extended | Yes | Standard | Google-Extended |
| Anthropic-AI | No | Unknown | anthropic-ai |

## The 1MB HTML Limit

### Research Findings

Salt.Agency and Botify research revealed:
- **18% of pages >1MB were abandoned** by AI crawlers
- Crawlers truncate or skip large payloads
- No warning or partial indexing - content simply isn't seen

### Measuring HTML Size

```bash
# Quick check
curl -sI https://example.com | grep -i content-length

# Accurate measurement (includes compression)
curl -s https://example.com | wc -c

# Check compressed vs uncompressed
curl -sH "Accept-Encoding: gzip" https://example.com --output /dev/null -w "%{size_download}\n"
```

### Size Budget Breakdown

For a 1MB limit, allocate wisely:

| Component | Max Budget | Notes |
|-----------|------------|-------|
| Core content | 500KB | Actual article/page content |
| Navigation/UI | 200KB | Headers, footers, menus |
| Inline CSS | 100KB | Critical styles only |
| Inline JS | 100KB | Essential scripts only |
| Metadata | 50KB | Schema, OpenGraph, etc |
| Buffer | 50KB | Safety margin |

### Reducing HTML Size

1. **Remove inline SVGs:** Link instead of embedding
2. **Defer non-critical CSS:** Use `media="print"` trick
3. **Remove comments:** Strip HTML comments in production
4. **Minify HTML:** Remove whitespace
5. **Lazy load below-fold:** Don't include in initial HTML
6. **Externalize scripts:** Move to separate files

## JavaScript Dependency Risk

### The Problem

Many AI crawlers don't execute JavaScript:
- Content rendered client-side is invisible
- Single-page apps (SPAs) show empty shells
- Dynamically loaded content isn't indexed

### Testing JS Dependency

```bash
# View raw HTML (what non-rendering crawlers see)
curl -s https://example.com | grep -o '<body[^>]*>.*</body>' | head -c 1000

# Compare with rendered DOM
# Use browser DevTools: View Source vs Inspect Element
```

### JS Dependency Score

Calculate the percentage of content requiring JavaScript:

```
js_dependency = (rendered_text_length - raw_html_text_length) / rendered_text_length * 100
```

| Score | Risk Level | Action |
|-------|------------|--------|
| <10% | Low | Content mostly visible |
| 10-30% | Medium | Audit critical content |
| 30-50% | High | Implement SSR/SSG |
| >50% | Critical | Major architecture change needed |

### Mitigation Strategies

#### 1. Server-Side Rendering (SSR)
Render on server before sending to client:
- Next.js: Use `getServerSideProps`
- Nuxt: Default behavior
- SvelteKit: Default behavior

#### 2. Static Site Generation (SSG)
Pre-render at build time:
- Next.js: Use `getStaticProps`
- Astro: Default behavior
- 11ty: Default behavior

#### 3. Hybrid Approach
Static shell + hydration:
- Critical content in HTML
- Interactive features via JS
- Progressive enhancement

#### 4. Prerendering Service
For SPAs that can't be refactored:
- Prerender.io
- Rendertron
- Custom prerendering

## Content-to-Code Ratio

### What It Measures

The ratio of meaningful text content to HTML/CSS/JS code:

```
content_ratio = text_content_bytes / total_html_bytes * 100
```

### Target Ratios

| Ratio | Assessment | Notes |
|-------|------------|-------|
| >25% | Excellent | Content-dense, AI-friendly |
| 15-25% | Good | Typical for content sites |
| 5-15% | Fair | Consider reducing boilerplate |
| <5% | Poor | Likely invisible to AI |

### Improving Content Ratio

1. **Remove duplicate navigation:** One nav, not three
2. **Trim footer bloat:** Essential links only
3. **Reduce widget HTML:** Compact markup
4. **Eliminate tracking pixels:** Move to JS
5. **Simplify forms:** Fewer hidden fields

## Mobile-First Considerations

AI crawlers increasingly use mobile user-agents:

### Check Mobile Rendering
```bash
curl -A "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15" \
  https://example.com
```

### Mobile-Specific Issues
- Hamburger menus hiding content
- Accordion content collapsed by default
- "Read more" truncation
- Infinite scroll without pagination

## Performance Budget

AI crawlers have timeout thresholds. Ensure:

| Metric | Target | Why |
|--------|--------|-----|
| TTFB | <500ms | Crawler patience |
| Full load | <3s | Timeout avoidance |
| HTML delivery | <1s | Initial content visible |

### Testing Performance

```bash
# Time to first byte
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" https://example.com

# Total download time
curl -o /dev/null -s -w "Total: %{time_total}s\n" https://example.com
```

## Crawler-Specific Headers

### Identifying Crawlers

Check User-Agent for AI crawlers:
```
GPTBot/1.0
ClaudeBot/1.0
PerplexityBot/1.0
anthropic-ai
Google-Extended
```

### robots.txt for AI

```txt
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Block specific paths from AI training
User-agent: GPTBot
Disallow: /private/
```

### Serving Crawler-Optimized Content

Consider serving simplified HTML to AI crawlers:
- Remove decorative elements
- Inline critical content
- Skip lazy-loading

**Note:** This should be done carefully to avoid cloaking penalties.

## Audit Checklist

### Technical Visibility Audit

- [ ] HTML size under 1MB
- [ ] Critical content visible without JS
- [ ] Content-to-code ratio >15%
- [ ] TTFB under 500ms
- [ ] Mobile rendering works
- [ ] robots.txt allows AI crawlers
- [ ] No infinite scroll without fallback
- [ ] Pagination present for lists
- [ ] Core content in initial HTML
- [ ] No render-blocking resources for content

### Quick Commands

```bash
# Full technical audit
python audit-geo.py https://example.com --mode technical

# HTML size check
curl -s https://example.com | wc -c

# JS dependency check (basic)
curl -s https://example.com | grep -c '<script'

# Content ratio estimate
curl -s https://example.com | \
  sed 's/<[^>]*>//g' | \
  tr -s '[:space:]' | \
  wc -c
```
