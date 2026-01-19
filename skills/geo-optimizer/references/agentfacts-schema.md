# AgentFacts Schema & NANDA Protocol

Machine-readable metadata for AI agent discovery and interaction.

## Overview

AgentFacts is part of the NANDA (Networked Agent Discovery Architecture) protocol, providing a standardized way for websites to declare their AI agent capabilities, endpoints, and trust parameters. This enables AI systems to programmatically discover and interact with services.

## Why AgentFacts Matters

As AI agents become the primary interface for information retrieval:
1. **Discoverability:** AI systems need structured data about your capabilities
2. **Trust:** Explicit trust declarations help AI systems assess reliability
3. **Interoperability:** Standard schema enables cross-platform compatibility
4. **Future-proofing:** Early adoption positions you for agentic web era

## File Location

AgentFacts must be placed at:
```
https://yourdomain.com/.well-known/agent-facts
```

Alternative locations (if `.well-known` is not available):
- `/agent-facts.json`
- `/_agent-facts`

## Complete Schema Reference

### Minimal Valid Schema

```json
{
  "@context": "https://nanda.dev/ns/agent-facts/v1",
  "id": "nanda:example.com",
  "agent_name": "Example Service"
}
```

### Full Schema

```json
{
  "@context": "https://nanda.dev/ns/agent-facts/v1",
  "id": "nanda:example.com",
  "agent_name": "urn:agent:example:com",
  "version": "1.0.0",
  "description": "Human-readable description of the service",
  "homepage": "https://example.com",
  "documentation": "https://docs.example.com",

  "endpoints": {
    "static": [
      "https://api.example.com/v1/agent",
      "https://api.example.com/v2/agent"
    ],
    "adaptive_resolver": {
      "url": "https://resolver.example.com/dispatch",
      "policies": ["geo", "load", "capability"]
    }
  },

  "capabilities": {
    "modalities": ["text", "image", "audio", "video", "code"],
    "operations": ["query", "create", "update", "delete"],
    "domains": ["search", "analytics", "automation"],
    "languages": ["en", "es", "fr", "de"],
    "authentication": {
      "methods": ["oauth2", "jwt", "apikey", "none"],
      "scopes": ["read", "write", "admin"]
    },
    "rate_limits": {
      "requests_per_minute": 60,
      "requests_per_day": 10000
    }
  },

  "trust": {
    "certification": "self-attested",
    "human_oversight": "true",
    "audit_log": "https://example.com/audit",
    "privacy_policy": "https://example.com/privacy",
    "terms_of_service": "https://example.com/terms"
  },

  "contact": {
    "email": "ai-support@example.com",
    "abuse": "abuse@example.com"
  },

  "metadata": {
    "created": "2024-01-15T00:00:00Z",
    "modified": "2025-06-20T00:00:00Z",
    "ttl": 86400
  }
}
```

## Schema Fields Explained

### Core Fields

| Field | Required | Description |
|-------|----------|-------------|
| `@context` | Yes | NANDA namespace URI |
| `id` | Yes | Unique identifier, format: `nanda:domain.com` |
| `agent_name` | Yes | URN or human-readable name |
| `version` | No | Schema version for your implementation |
| `description` | No | Brief service description |

### Endpoints Object

Defines how AI agents can interact with your service.

#### Static Endpoints
Fixed URLs that always respond:
```json
"static": [
  "https://api.example.com/v1/agent"
]
```

#### Adaptive Resolver
Dynamic routing based on policies:
```json
"adaptive_resolver": {
  "url": "https://resolver.example.com/dispatch",
  "policies": ["geo", "load", "capability"]
}
```

**Policies:**
- `geo`: Route based on geographic location
- `load`: Route based on server load
- `capability`: Route based on requested capability
- `version`: Route based on API version

### Capabilities Object

#### Modalities
What types of content your service handles:
- `text`: Natural language text
- `image`: Image processing/generation
- `audio`: Audio processing/generation
- `video`: Video processing/generation
- `code`: Source code analysis/generation

#### Operations
What actions agents can perform:
- `query`: Read/search operations
- `create`: Generate new content
- `update`: Modify existing content
- `delete`: Remove content

#### Authentication
```json
"authentication": {
  "methods": ["oauth2", "jwt", "apikey"],
  "scopes": ["read", "write"]
}
```

**Methods:**
- `oauth2`: OAuth 2.0 flow
- `jwt`: JSON Web Token
- `apikey`: API key in header
- `none`: No authentication required

### Trust Object

Declares trust and oversight parameters.

| Field | Values | Description |
|-------|--------|-------------|
| `certification` | `self-attested`, `third-party`, `audited` | Level of external validation |
| `human_oversight` | `true`, `false`, `on-request` | Human review availability |
| `audit_log` | URL | Link to audit trail |

### Metadata Object

```json
"metadata": {
  "created": "2024-01-15T00:00:00Z",
  "modified": "2025-06-20T00:00:00Z",
  "ttl": 86400
}
```

- `ttl`: Time-to-live in seconds for caching

## Implementation Examples

### SaaS Application

```json
{
  "@context": "https://nanda.dev/ns/agent-facts/v1",
  "id": "nanda:myapp.com",
  "agent_name": "MyApp AI Assistant",
  "description": "Project management with AI automation",
  "endpoints": {
    "static": ["https://api.myapp.com/agent/v1"]
  },
  "capabilities": {
    "modalities": ["text"],
    "operations": ["query", "create", "update"],
    "domains": ["project-management", "task-automation"],
    "authentication": {
      "methods": ["oauth2"],
      "scopes": ["read:projects", "write:tasks"]
    }
  },
  "trust": {
    "certification": "self-attested",
    "human_oversight": "true",
    "privacy_policy": "https://myapp.com/privacy"
  }
}
```

### E-commerce Site

```json
{
  "@context": "https://nanda.dev/ns/agent-facts/v1",
  "id": "nanda:shop.example.com",
  "agent_name": "Example Shop",
  "description": "Product catalog and ordering",
  "endpoints": {
    "static": ["https://api.shop.example.com/agent"]
  },
  "capabilities": {
    "modalities": ["text", "image"],
    "operations": ["query"],
    "domains": ["e-commerce", "product-search"],
    "authentication": {
      "methods": ["none", "apikey"]
    },
    "rate_limits": {
      "requests_per_minute": 30
    }
  },
  "trust": {
    "certification": "self-attested",
    "human_oversight": "on-request"
  }
}
```

### Content Platform

```json
{
  "@context": "https://nanda.dev/ns/agent-facts/v1",
  "id": "nanda:blog.example.com",
  "agent_name": "Example Blog",
  "description": "Technical articles and tutorials",
  "endpoints": {
    "static": ["https://blog.example.com/api/content"]
  },
  "capabilities": {
    "modalities": ["text", "code"],
    "operations": ["query"],
    "domains": ["technical-content", "tutorials"],
    "languages": ["en"],
    "authentication": {
      "methods": ["none"]
    }
  },
  "trust": {
    "certification": "self-attested",
    "human_oversight": "true"
  }
}
```

## Validation

### JSON-LD Validation
AgentFacts uses JSON-LD. Validate with:
1. JSON syntax validation
2. JSON-LD playground: https://json-ld.org/playground/
3. Custom NANDA validators (when available)

### Required Fields Check
```python
REQUIRED_FIELDS = ["@context", "id", "agent_name"]

def validate_agentfacts(schema):
    for field in REQUIRED_FIELDS:
        if field not in schema:
            raise ValueError(f"Missing required field: {field}")

    if not schema["@context"].startswith("https://nanda.dev"):
        raise ValueError("Invalid @context namespace")

    if not schema["id"].startswith("nanda:"):
        raise ValueError("ID must start with 'nanda:'")

    return True
```

## Serving AgentFacts

### Nginx Configuration
```nginx
location /.well-known/agent-facts {
    default_type application/ld+json;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=86400";
}
```

### Express.js
```javascript
app.get('/.well-known/agent-facts', (req, res) => {
  res.type('application/ld+json');
  res.sendFile(path.join(__dirname, 'agent-facts.json'));
});
```

### Next.js (App Router)
```typescript
// app/.well-known/agent-facts/route.ts
import { NextResponse } from 'next/server';
import agentFacts from './agent-facts.json';

export async function GET() {
  return NextResponse.json(agentFacts, {
    headers: {
      'Content-Type': 'application/ld+json',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
```

## Testing

### Verify Accessibility
```bash
curl -I https://yourdomain.com/.well-known/agent-facts
# Should return 200 with Content-Type: application/ld+json

curl https://yourdomain.com/.well-known/agent-facts | jq .
# Should return valid JSON
```

### Validate Schema
```bash
python generate-agentfacts.py --validate https://yourdomain.com/.well-known/agent-facts
```

## Best Practices

1. **Keep it current:** Update `metadata.modified` when capabilities change
2. **Be accurate:** Only declare capabilities you actually support
3. **Set reasonable TTL:** 86400 (24 hours) is typical
4. **Include contact info:** AI systems may need to report issues
5. **Start minimal:** Add fields as you implement features
6. **Version your schema:** Use `version` field for tracking changes
