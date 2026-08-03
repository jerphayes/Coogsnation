# CoogsNation Foundation v2.4 — Universal AI

This release adds a provider-neutral AI subsystem without tying CoogsNation to one model vendor.

## Providers

- OpenAI-compatible APIs
- Anthropic Messages API
- DeepSeek
- xAI
- Ollama/local models
- Custom OpenAI-compatible endpoints

## Controls

- HTTP and Socket.IO authentication
- Real streaming responses
- Strict payload and length validation
- Per-minute, daily, concurrent, token, timeout, and monthly-budget limits
- PostgreSQL usage, cost, knowledge, and feedback records
- Conversation text disabled by default
- Administrator approval required by default before learned answers are reused
- One vote per user per answer
- Fail-closed moderation
- Plain-text sanitization and prompt-injection boundaries
- Environment kill switch (`AI_ENABLED=false`)

## Required validation

```bash
npm ci --no-audit --no-fund
npm run security:check
npm run check
npm run build
```
