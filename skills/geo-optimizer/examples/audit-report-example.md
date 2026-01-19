# GEO Audit Report Example

This is a sample output from running `audit-geo.py` on a production site.

## Command

```bash
python audit-geo.py https://example-saas.com --launch-year 2023
```

## Sample Output

```
============================================================
GEO AUDIT REPORT
Target: https://example-saas.com
Generated: 2025-06-15T14:30:22
============================================================

## TECHNICAL VISIBILITY

HTML Size: 0.342 MB (358,912 bytes)
Size Risk: LOW (limit: 1.0 MB)

Script Tags: 12
Raw Text Length: 8,234 chars
JS Dependency Risk: LOW
Note: Substantial text in raw HTML

Content-to-Code Ratio: 23.1%
Rating: GOOD

## CONTENT AUTHORITY

Word Count: 1,247
Hedge Words Found: 8
Hedge Density: 0.641%
Confidence Rating: POOR

Examples: might, possibly, however, it seems, could be

## AGENT INFRASTRUCTURE

AgentFacts Present: No
Recommendation: Implement AgentFacts at /.well-known/agent-facts
See: references/agentfacts-schema.md

## DISCOVERY STRATEGY

Status: Early Stage (1-2 years)
Estimated AI Visibility: ~3%
Primary Strategy: Hybrid approach

Focus Areas:
  - Continue web-augmented signals
  - Begin basic GEO optimization
  - Implement AgentFacts
  - Build content authority

============================================================
END OF REPORT
============================================================
```

## Interpretation Guide

### Technical Visibility

| Metric | This Site | Target | Status |
|--------|-----------|--------|--------|
| HTML Size | 0.342 MB | <1.0 MB | ✓ Good |
| JS Risk | LOW | LOW | ✓ Good |
| Content Ratio | 23.1% | >15% | ✓ Good |

**Action:** Technical visibility is solid. No immediate action needed.

### Content Authority

| Metric | This Site | Target | Status |
|--------|-----------|--------|--------|
| Hedge Density | 0.641% | <0.2% | ✗ Needs Work |
| Rating | POOR | GOOD+ | ✗ Needs Work |

**Action:** Content needs confidence improvement. Specific hedges found:
- "might help" → "helps"
- "possibly the best" → "the best for [use case]"
- "however" → remove or be specific
- "it seems effective" → "evidence shows it's effective"
- "could be useful" → "is useful for [scenario]"

### Agent Infrastructure

**Action:** Implement AgentFacts schema at `/.well-known/agent-facts`

Example implementation:
```json
{
  "@context": "https://nanda.dev/ns/agent-facts/v1",
  "id": "nanda:example-saas.com",
  "agent_name": "Example SaaS",
  "endpoints": {
    "static": ["https://api.example-saas.com/v1/agent"]
  },
  "capabilities": {
    "modalities": ["text"],
    "authentication": {
      "methods": ["oauth2"]
    }
  },
  "trust": {
    "certification": "self-attested",
    "human_oversight": "true"
  }
}
```

### Discovery Strategy

Site is 2 years old - transitioning from "recency wall" phase:

**Continue:**
- Reddit engagement
- Earning backlinks
- Social proof building

**Start:**
- GEO content optimization
- AgentFacts implementation
- Hedge density reduction

## Priority Actions

1. **High:** Reduce hedge density from 0.641% to <0.2%
2. **Medium:** Implement AgentFacts at `/.well-known/agent-facts`
3. **Low:** Continue web-augmented signal building

## Follow-up Commands

```bash
# Check specific page hedge density
python check-hedge-density.py --url https://example-saas.com/about

# Generate AgentFacts schema
python generate-agentfacts.py \
  --domain example-saas.com \
  --agent-name "Example SaaS" \
  --capabilities text \
  --auth oauth2

# Re-audit after improvements
python audit-geo.py https://example-saas.com --output report-v2.md
```
