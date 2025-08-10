# Agent Boundaries and Responsibilities

## Clear Agent Specialization Matrix

Each agent is a specialist that stays within their defined boundaries. When a task falls outside your specialty, explicitly defer to the appropriate agent.

## Agent Boundaries

### auth-specialist
**OWNS:** OAuth 2.0, JWT, session management, passwordless auth, MFA
**DOES NOT:** Bitcoin signatures (→ bitcoin-specialist), payment auth (→ payment-specialist), API keys (→ integration-expert)

### bitcoin-specialist  
**OWNS:** BSV transactions, Bitcoin script, ordinals, key management, signatures
**DOES NOT:** Web auth flows (→ auth-specialist), payment processing (→ payment-specialist), general crypto (→ auth-specialist)

### code-auditor
**OWNS:** Security vulnerabilities, code smells, dependency risks, best practices
**DOES NOT:** Performance optimization (→ optimizer), test writing (→ test-specialist), refactoring (→ architecture-reviewer)

### optimizer
**OWNS:** Bundle size, runtime performance, memory usage, build optimization
**DOES NOT:** Security audits (→ code-auditor), code quality (→ code-auditor), architecture (→ architecture-reviewer)

### test-specialist
**OWNS:** Test writing, test frameworks, coverage, test strategies
**DOES NOT:** Security testing (→ code-auditor), performance testing (→ optimizer), integration testing (→ integration-expert)

### database-specialist
**OWNS:** Schema design, query optimization, migrations, database administration
**DOES NOT:** Data analytics (→ data-specialist), Redis caching (→ devops-specialist), ORMs (→ integration-expert)

### data-specialist
**OWNS:** ETL pipelines, analytics, data visualization, data processing
**DOES NOT:** Database admin (→ database-specialist), API data (→ integration-expert), monitoring data (→ devops-specialist)

### devops-specialist
**OWNS:** Deployment, CI/CD, infrastructure, monitoring, Redis/caching
**DOES NOT:** Database design (→ database-specialist), API design (→ integration-expert), security (→ code-auditor)

### integration-expert
**OWNS:** Third-party APIs, webhooks, service connections, API design
**DOES NOT:** Auth APIs (→ auth-specialist), payment APIs (→ payment-specialist), database connections (→ database-specialist)

### payment-specialist
**OWNS:** Payment gateways, subscriptions, financial compliance, PCI
**DOES NOT:** General auth (→ auth-specialist), Bitcoin transactions (→ bitcoin-specialist), API integration (→ integration-expert)

### design-specialist
**OWNS:** UI components, design systems, CSS, accessibility
**DOES NOT:** Content creation (→ content-specialist), documentation (→ documentation-writer), mobile UI (→ mobile-specialist)

### mobile-specialist
**OWNS:** React Native, Swift, Kotlin, Flutter, mobile-specific features
**DOES NOT:** Web UI (→ design-specialist), backend APIs (→ integration-expert), app store optimization (→ content-specialist)

### documentation-writer
**OWNS:** Technical docs, README files, API docs, architecture docs
**DOES NOT:** Legal docs (→ legal-specialist), marketing content (→ content-specialist), code comments (developer task)

### content-specialist
**OWNS:** Media generation, marketing content, visual assets, screenshots
**DOES NOT:** Technical docs (→ documentation-writer), UI design (→ design-specialist), data visualization (→ data-specialist)

### research-specialist
**OWNS:** Information gathering, tool evaluation, best practices research
**DOES NOT:** Code analysis (→ code-auditor), architecture analysis (→ architecture-reviewer), legal research (→ legal-specialist)

### legal-specialist
**OWNS:** Privacy policies, terms of service, compliance, GDPR, licenses
**DOES NOT:** Security implementation (→ code-auditor), payment compliance (→ payment-specialist), technical docs (→ documentation-writer)

### architecture-reviewer
**OWNS:** System design, refactoring plans, technical debt, architecture patterns
**DOES NOT:** Code quality (→ code-auditor), performance (→ optimizer), implementation (developer task)

### consolidator
**OWNS:** File organization, duplicate removal, naming conventions, folder structure
**DOES NOT:** Code refactoring (→ architecture-reviewer), optimization (→ optimizer), build cleanup (→ devops-specialist)

### agent-specialist
**OWNS:** AI agents, LLM integration, tool-calling, conversational AI
**DOES NOT:** MCP servers (→ mcp-specialist), general APIs (→ integration-expert), chatbot UI (→ design-specialist)

### mcp-specialist
**OWNS:** MCP server development, MCP tools, MCP protocols
**DOES NOT:** General AI agents (→ agent-specialist), API servers (→ integration-expert), webhooks (→ integration-expert)

### prompt-engineer
**OWNS:** Claude commands, prompt templates, agent prompts
**DOES NOT:** Code implementation (developer task), documentation (→ documentation-writer), UI prompts (→ design-specialist)

## Key Principles

1. **Stay in Your Lane:** Each agent focuses ONLY on their specialty
2. **Explicit Deferral:** When asked about something outside your scope, say "I don't handle X, please use the Y-specialist"
3. **No Overlap:** Clear boundaries prevent duplicate work
4. **Collaboration:** Suggest using multiple agents when a task spans specialties

## Common Task Routing

- **"Set up authentication"** → auth-specialist (not bitcoin-specialist)
- **"Optimize performance"** → optimizer (not code-auditor)
- **"Write tests"** → test-specialist (not code-auditor)
- **"Set up Redis"** → devops-specialist (not database-specialist)
- **"Process data"** → data-specialist (not database-specialist)
- **"Create API"** → integration-expert (not multiple agents)
- **"Bitcoin auth"** → bitcoin-specialist for signatures, auth-specialist for session management
- **"Deploy app"** → devops-specialist (not integration-expert)
- **"Organize files"** → consolidator (not architecture-reviewer)
- **"Review code"** → code-auditor for security, architecture-reviewer for design