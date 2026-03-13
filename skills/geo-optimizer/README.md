# GEO Optimizer

Generative Engine Optimization (GEO) for AI search visibility.

## What is GEO?

GEO is NOT traditional SEO. AI search engines (ChatGPT, Perplexity, Claude, Gemini) work fundamentally differently from web search engines:

1. **They fetch raw HTML** — Many don't render JavaScript
2. **They have size limits** — Crawlers abandon pages >1MB HTML
3. **They evaluate confidence** — Hedged language ("maybe", "possibly") ranks 3x lower than confident assertions
4. **They need machine-readable metadata** — AgentFacts/NANDA protocol for AI agent discovery

Traditional SEO optimizes for link graphs and keyword density. GEO optimizes for crawler accessibility, content confidence, and agent discoverability.

## How GEO Differs from SEO

| Dimension | Traditional SEO | GEO |
|-----------|----------------|-----|
| Ranking signals | Backlinks, keywords | Citation confidence, entity density |
| Crawler behavior | Renders JS | Often does not render JS |
| Page size | Rarely an issue | >1MB = abandonment |
| Metadata format | Open Graph, Schema.org | AgentFacts (NANDA protocol) |
| Age advantage | Domain authority grows slowly | Startups face 30:1 recency wall |

## Research Background

The key findings driving GEO strategy:

- **Hedge density** — Confident assertions cite 3x higher in AI responses than hedged language. Every "maybe", "possibly", or "it seems" reduces citation probability.
- **Size limits** — Pages over 1MB raw HTML are abandoned by 18% of crawlers. Content truncation risks increase linearly above this threshold.
- **JS rendering gap** — GPTBot and PerplexityBot (sometimes) render JavaScript. ClaudeBot and most others do not. Sites that require JS to display content are invisible to ~40% of AI crawlers.
- **Discovery gap** — Sites under 2 years old have ~3.3% AI visibility vs ~99% for established domains. This "recency wall" requires a different strategy: web-augmented signals (Reddit, referring domains) rather than direct GEO content.

## Key Takeaways

1. **GEO != SEO** — Different crawlers, different rules, different optimization targets
2. **Confidence wins** — Hedge density below 0.2% is the target for high citation rates
3. **Size matters** — Stay under 1MB raw HTML to avoid crawler abandonment
4. **JS is risky** — Content must be accessible without JavaScript rendering
5. **Age affects strategy** — Startups under 2 years need web-augmented signals, not just on-page GEO
6. **AgentFacts is future-proofing** — Implement the NANDA protocol now for AI agent discovery

## When to Use This Skill

Use the `geo-optimizer` skill when you need to:

- Audit a site for AI search visibility
- Analyze content hedge density
- Check crawler accessibility (HTML size, JS dependency)
- Set up AgentFacts / NANDA protocol for agent discovery
- Build a GEO optimization report
- Understand why a site isn't appearing in AI-generated answers
- Optimize content for citation by ChatGPT, Perplexity, Claude, or Gemini

Trigger phrases: "audit for AI visibility", "optimize for ChatGPT", "check GEO readiness", "analyze hedge density", "generate agentfacts", "check if my site works with AI search", "test LLM crawlability".
