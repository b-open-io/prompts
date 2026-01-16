# GEO & AI Discovery Optimization

## Understanding AI Visibility

AI assistants (ChatGPT, Perplexity, Claude) are becoming primary discovery channels. Optimizing for AI citation requires different strategies than traditional SEO.

### Market Impact (Verified 2026 Data)

- **AI agents now account for ~33% of organic search activity** (and climbing)
- ChatGPT now refers around 10% of new Vercel signups (up from 1% six months ago)
- Only 12% of companies appear across all three platforms (ChatGPT, Perplexity, Claude)
- Citation patterns vary by up to 300% across platforms
- Multi-platform optimization drives 3.2x more AI-sourced leads

### The Discovery Gap

Research shows a 30:1 ratio between discovery queries ("best project management tools") and direct queries ("Asana pricing") in AI assistants. Most searches are discovery-focused, making AI visibility critical.

## Technical Optimizations

### Server-Side Rendering (SSR)

AI crawlers may not execute JavaScript. Ensure content is available in initial HTML:

- Use Next.js with SSR/SSG
- Pre-render critical pages
- Test with JavaScript disabled
- Check `view-source:` shows content
- **Server response time < 200ms** (critical for LLM crawler access)

> **Verified:** AI systems and LLMs like ChatGPT cannot render JavaScript. They rely on static HTML for content access. Most AI crawlers fetch but do not execute JavaScript.

### Structured Data

Implement schema.org markup:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Your Product",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "49",
    "priceCurrency": "USD"
  }
}
```

Also implement:
- FAQPage schema for common questions
- Organization schema for company info
- Product schema for features

### Core Web Vitals

AI systems may factor in page quality signals:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s |
| INP | < 200ms | 200ms - 500ms | > 500ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |

Test with:
- PageSpeed Insights
- Chrome DevTools Lighthouse
- web.dev/measure

## Content Optimization

### Authoritative Language

Write with confidence and specificity. While "hedge density" is not a verified technical metric, AI systems favor content that:

**Avoid:**
- "might be", "could potentially", "may help"
- "in some cases", "it depends", "possibly"
- Excessive qualifiers and disclaimers

**Prefer:**
- Direct statements: "X does Y"
- Specific claims with evidence
- Confident, authoritative tone

### Platform-Specific Content Length (Verified)

| Platform | Optimal Content Length | Notes |
|----------|----------------------|-------|
| ChatGPT | 2,000+ words | Favors comprehensive guides |
| Claude | 1,500-2,500 words | Prefers balanced analysis, strong hierarchy |
| Perplexity | Quality over length | Searches web, cites every source |

### Answer-First Content

Structure content for AI extraction:

1. **Lead with the answer** - First sentence answers the question
2. **Expand with context** - Supporting details follow
3. **Provide evidence** - Data, examples, case studies
4. **Include alternatives** - Acknowledge other options

### FAQ Optimization

Create comprehensive FAQs that:
- Use natural question phrasing
- Provide complete, standalone answers
- Cover comparison queries ("X vs Y")
- Address pricing and feature questions

## AI Visibility Audit Process

### Step 1: Query AI Assistants

Test these query patterns:
- "[category] tools" (e.g., "project management tools")
- "best [category] for [use case]"
- "[your product] vs [competitor]"
- "[category] alternatives to [leader]"

### Step 2: Analyze Results

For each query:
- Is your product mentioned?
- What position in the list?
- Is the description accurate?
- What competitors are cited?

### Step 3: Citation Sentiment

Review how AI describes your product:
- Positive, neutral, or negative framing?
- Accurate feature descriptions?
- Correct pricing information?
- Any outdated information?

## Improving AI Visibility

### Content Strategy

1. **Comparison pages** - Create "[Product] vs [Competitor]" pages
2. **Category pages** - "Best [category] tools in 2026"
3. **Use case pages** - "[Product] for [specific use case]"
4. **Integration pages** - "[Product] + [popular tool] integration"

### Authority Building

AI systems weight authoritative sources:
- Get mentioned in industry publications
- Contribute to relevant communities
- Build quality backlinks
- Maintain active social presence

### Freshness Signals

Keep content updated:
- Regular blog posts
- Updated pricing/feature pages
- Recent customer testimonials
- Current year references

## Monitoring

### Regular Audits

Monthly AI visibility checks:
- Query primary category terms
- Track mention frequency
- Monitor sentiment changes
- Compare to competitors

### Tracking Tools

While dedicated AI visibility tools are emerging, use:
- Manual queries across ChatGPT, Perplexity, Claude
- Set up alerts for brand mentions
- Monitor referral traffic from AI sources
