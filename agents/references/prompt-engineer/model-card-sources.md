# Model Card & Model List Sources

Reference for looking up model information across major AI providers.

## Quick Reference Table

| Provider | List Models Endpoint | Docs URL | Prompting Guide |
|---|---|---|---|
| **Anthropic** | `GET https://api.anthropic.com/v1/models` | [models/overview](https://platform.claude.com/docs/en/docs/about-claude/models/overview) | [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) |
| **OpenAI** | `GET https://api.openai.com/v1/models` | [platform.openai.com/docs/models](https://platform.openai.com/docs/models) | [prompt engineering guide](https://platform.openai.com/docs/guides/prompt-engineering) |
| **Google Gemini** | `GET https://generativelanguage.googleapis.com/v1beta/models?key=$KEY` | [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models) | [prompting intro](https://ai.google.dev/gemini-api/docs/prompting-intro) |
| **xAI (Grok)** | `GET https://api.x.ai/v1/models` | [docs.x.ai/developers/models](https://docs.x.ai/developers/models) | [docs.x.ai/docs](https://docs.x.ai/docs) |
| **Mistral** | `GET https://api.mistral.ai/v1/models` | [models overview](https://docs.mistral.ai/getting-started/models/models_overview/) | [prompting capabilities](https://docs.mistral.ai/guides/prompting-capabilities/) |
| **Cohere** | `GET https://api.cohere.com/v1/models` | [docs.cohere.com/docs/models](https://docs.cohere.com/docs/models) | [crafting prompts](https://docs.cohere.com/docs/crafting-effective-prompts) |
| **Groq (Llama)** | `GET https://api.groq.com/openai/v1/models` | [console.groq.com/docs/models](https://console.groq.com/docs/models) | [console.groq.com/docs/openai](https://console.groq.com/docs/openai) |
| **Together AI (Llama)** | `GET https://api.together.xyz/v1/models` | [serverless models](https://docs.together.ai/docs/serverless-models) | [prompting](https://docs.together.ai/docs/prompting) |

## curl Commands

```bash
# Anthropic
curl https://api.anthropic.com/v1/models \
  -H "anthropic-version: 2023-06-01" \
  -H "X-Api-Key: $ANTHROPIC_API_KEY" | jq '.data[].id'

# OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[].id'

# Google Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
  | jq '.models[].name'

# xAI
curl https://api.x.ai/v1/models \
  -H "Authorization: Bearer $XAI_API_KEY" | jq '.data[].id'

# Mistral
curl https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $MISTRAL_API_KEY" | jq '.data[].id'

# Cohere
curl https://api.cohere.com/v1/models \
  -H "Authorization: Bearer $COHERE_API_KEY" | jq '.models[].name'

# Groq
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | jq '.data[].id'

# Together AI
curl https://api.together.xyz/v1/models \
  -H "Authorization: Bearer $TOGETHER_API_KEY" | jq '.[].id'
```

## Vercel AI SDK

**No CLI command for model discovery.** Use either:

- **Web catalog**: [vercel.com/ai-gateway/models](https://vercel.com/ai-gateway/models) (browsable, no auth)
- **SDK method**: `gateway.getAvailableModels()` via `@ai-sdk/gateway`
- **Provider docs**: [ai-sdk.dev/providers/ai-sdk-providers](https://ai-sdk.dev/providers/ai-sdk-providers)

**Model ID format**: `provider:model-id` (e.g., `anthropic:claude-sonnet-4-6`, `openai:gpt-5.1-instant`, `google:gemini-2.5-flash`)

```ts
import { createGateway } from '@ai-sdk/gateway';
const gateway = createGateway({ apiKey: process.env.VERCEL_AI_GATEWAY_KEY });
const models = await gateway.getAvailableModels();
```

## Meta Llama

No first-party inference API. Use via:
- **Groq** (fastest) — `https://api.groq.com/openai/v1`
- **Together AI** (broadest selection) — `https://api.together.xyz/v1`
- **Amazon Bedrock**, **Azure**, **Google Vertex** for enterprise

Weights published at [llama.com](https://llama.com) and [huggingface.co/meta-llama](https://huggingface.co/meta-llama).

## Key Differences in Prompting Style

| Feature | Claude | OpenAI GPT | Gemini | Grok |
|---------|--------|-----------|--------|------|
| XML tags | Strong preference | Works but less impact | Works | Works |
| System prompt weight | Very high | High | Moderate | High |
| Chain-of-thought | Extended thinking available | Reasoning models (o-series) | Thinking mode available | Reasoning mode available |
| Structured output | Tool use + JSON mode | Function calling + JSON mode | Function calling + JSON | Function calling |
| Best for long context | 200k tokens | 128k-1M tokens | 1M-2M tokens | 128k-1M tokens |
