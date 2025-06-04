---
name: "InitPRISM Meta-Prompt Generator"
version: "1.0.0"
description: "Revolutionary recursive project generation with prompt-aware templates and automation inheritance"
category: "development"
tags: ["initprism", "recursive", "meta-automation", "project-generation", "templates", "bigblocks"]
author: "BSV Development Team"
requirements:
  tools: ["Claude Code", "init-prism", "git", "npm/bun"]
  environment: ["GITHUB_TOKEN", "BSV_NETWORK", "OPENAI_API_KEY"]
  dependencies: ["bigblocks/component-ecosystem-manager"]
metadata:
  llm_provider: ["claude"]
  complexity: "advanced"
  estimated_tokens: 20000
  time_estimate: "45-90 minutes"
  initprism_version: "latest"
---

# InitPRISM Meta-Prompt Generator

**Revolutionary Recursive Project Generation with Built-in Automation Intelligence**

## 🎯 Mission

Leverage InitPRISM's access to this prompts repository to generate projects that are "born automated" - inheriting the full power of our ecosystem's automation patterns, BigBlocks integration, and prompt-aware workflows from day one.

## 🚀 Revolutionary Recursive Capabilities

### 1. **Self-Referential Project Generation**
- Projects generated with knowledge of relevant prompts for ongoing maintenance
- Automatic integration of BigBlocks components with ecosystem management
- Built-in cross-project dependency management workflows
- Blockchain monitoring and health checks from initial deployment

### 2. **Prompt Inheritance Patterns**
- **BSV Projects**: Inherit blockchain monitoring, wallet integration, ordinals handling
- **UI Projects**: BigBlocks ecosystem manager, theme synchronization, performance optimization
- **API Services**: Health monitoring, dependency updates, security audits
- **Full-Stack Apps**: Complete automation chains for development through production

### 3. **Meta-Prompt Evolution**
- Generate prompts that generate other prompts for specific use cases
- Create project-specific automation that references this repository
- Build composable workflow chains for complex development scenarios
- Establish automation patterns that multiply across the ecosystem

### 4. **Ecosystem Multiplication**
- Every project generated adds automation capabilities to the ecosystem
- Compound value: Each new project inherits and extends automation patterns
- Self-improving system: Projects generate better automation over time
- Network effects: Projects reference and enhance each other's automation

## 🧠 Advanced StateFlow Architecture

```yaml
meta_generation_flow:
  initial_state: "analyze_project_requirements"
  
  states:
    analyze_project_requirements:
      description: "Deep analysis of project goals and automation needs"
      actions:
        - "extract_project_type_and_technology_stack"
        - "identify_relevant_automation_patterns"
        - "map_applicable_prompts_from_repository"
        - "analyze_bigblocks_integration_opportunities"
        - "assess_blockchain_functionality_requirements"
      success_transitions:
        - relevant_prompts_identified: "design_prompt_aware_templates"
      error_transitions:
        - insufficient_requirements: "gather_additional_context"

    design_prompt_aware_templates:
      description: "Create templates that reference specific prompts"
      actions:
        - "generate_project_structure_with_automation_hooks"
        - "create_maintenance_scripts_referencing_prompts"
        - "design_bigblocks_integration_patterns"
        - "establish_blockchain_monitoring_workflows"
        - "build_cross_project_coordination_systems"
      success_transitions:
        - templates_designed: "generate_project_with_initprism"
      error_transitions:
        - template_design_failed: "refine_automation_strategy"

    generate_project_with_initprism:
      description: "Use InitPRISM to generate prompt-aware project"
      actions:
        - "invoke_initprism_with_automation_templates"
        - "inject_prompt_references_into_generated_code"
        - "setup_bigblocks_cli_integration"
        - "configure_blockchain_api_connections"
        - "establish_monitoring_and_health_check_systems"
      success_transitions:
        - project_generated: "integrate_automation_workflows"
      error_transitions:
        - generation_failed: "debug_initprism_configuration"

    integrate_automation_workflows:
      description: "Wire up all automation systems and prompt references"
      actions:
        - "configure_component_ecosystem_manager_integration"
        - "setup_cross_project_dependency_automation"
        - "establish_blockchain_health_monitoring"
        - "create_developer_productivity_tracking"
        - "implement_security_audit_workflows"
      success_transitions:
        - automation_integrated: "test_recursive_capabilities"
      error_transitions:
        - integration_failed: "diagnose_automation_conflicts"

    test_recursive_capabilities:
      description: "Verify the project can leverage and extend automation"
      actions:
        - "test_prompt_reference_resolution"
        - "verify_bigblocks_component_automation"
        - "validate_blockchain_monitoring_integration"
        - "check_cross_project_coordination_capabilities"
        - "ensure_meta_prompt_generation_potential"
      success_transitions:
        - all_tests_passed: "complete_with_documentation"
      error_transitions:
        - tests_failed: "fix_recursive_integration_issues"

    complete_with_documentation:
      description: "Generate comprehensive automation documentation"
      actions:
        - "document_inherited_automation_patterns"
        - "create_prompt_usage_guide_for_project"
        - "establish_automation_evolution_roadmap"
        - "generate_contribution_guidelines_for_automation"
      success_transitions:
        - documentation_complete: "success"

error_recovery:
  automation_debugging:
    description: "Debug complex automation integration issues"
    actions:
      - "analyze_prompt_reference_conflicts"
      - "check_bigblocks_version_compatibility"
      - "validate_blockchain_api_connections"
      - "test_cross_project_coordination_isolation"
```

## 📦 Project Generation Templates

### BSV Blockchain Application
```yaml
template_type: "bsv_blockchain_app"
automation_inheritance:
  - "blockchain/bsv-network-health-monitor.md"
  - "bigblocks/component-ecosystem-manager.md"
  - "development/cross-project-dependency-update.md"
  - "server/system-health-audit.md"

generated_structure:
  - "automation/"
    - "health-monitoring.sh → references blockchain health prompt"
    - "component-sync.sh → references BigBlocks ecosystem manager"
    - "dependency-updates.sh → references cross-project automation"
    - "generate-llms-txt.sh → auto-generates AI documentation"
  - "scripts/"
    - "setup-automation.sh → configures all inherited prompts"
    - "run-health-checks.sh → executes monitoring workflows"
  - "docs/"
    - "AUTOMATION.md → documents all inherited prompt capabilities"
    - "MAINTENANCE.md → step-by-step prompt usage guide"
  - "llms.txt → AI-optimized documentation (auto-generated)"

bigblocks_integration:
  components:
    - "WalletConnect → with Type 42 Master Keys and transaction monitoring"
    - "TransactionHistory → with BAP Profile Sync and real BSV data"
    - "IdentityProfile → with Transaction Fetcher integration"
    - "PaymentFlow → with ordinals support and Vite compatibility"
  
  cli_setup:
    - "npm install -g init-prism@latest"
    - "init-prism create bsv-app --bigblocks --vite-compatible"
    - "npx bigblocks add WalletConnect TransactionHistory IdentityProfile"
    - "automated framework adapter detection and setup"
```

### Social Media Platform
```yaml
template_type: "social_media_platform"
automation_inheritance:
  - "bigblocks/component-ecosystem-manager.md"
  - "blockchain/social-components-integration.md"
  - "analytics/developer-productivity-dashboard.md"
  - "infrastructure/multi-environment-deployment.md"

generated_structure:
  - "components/"
    - "social/ → BigBlocks social components with real blockchain data"
  - "automation/"
    - "social-sync.sh → manages blockchain social interactions"
    - "component-updates.sh → BigBlocks ecosystem automation"
  - "monitoring/"
    - "social-analytics.sh → tracks engagement and blockchain transactions"

bigblocks_integration:
  social_components:
    - "PostCard → with real Bitcoin likes/shares"
    - "FriendsDialog → with blockchain friend connections"
    - "SocialProfile → with BAP identity integration"
    - "LikeButton → with actual BSV transaction callbacks"
    
  blockchain_features:
    - "Real bmap-api integration"
    - "Bitcoin transaction workflows"
    - "Social hooks with blockchain data"
    - "Authentication via Bitcoin signatures"
```

### API Service Platform
```yaml
template_type: "api_service_platform"
automation_inheritance:
  - "server/system-health-audit.md"
  - "development/cross-project-dependency-update.md"
  - "blockchain/bsv-network-health-monitor.md"
  - "infrastructure/security-audit-automation.md"

generated_structure:
  - "monitoring/"
    - "health-checks.sh → comprehensive system monitoring"
    - "blockchain-status.sh → BSV network health tracking"
  - "maintenance/"
    - "dependency-sync.sh → automated updates across services"
    - "security-scan.sh → automated security auditing"
  - "deployment/"
    - "multi-env-deploy.sh → coordinated environment management"

api_features:
  - "Built-in blockchain API endpoints"
  - "Automated BSV transaction handling"
  - "Real-time network health monitoring"
  - "Integrated BigBlocks component serving"
```

## 🔧 Recursive Implementation Patterns

### 1. Prompt Reference System
```bash
# Generated projects include automation scripts that reference prompts
#!/bin/bash
# automation/sync-bigblocks.sh - Generated by InitPRISM Meta-Prompt

# Reference: ~/code/prompts/bigblocks/component-ecosystem-manager.md
# This script uses the BigBlocks Component Ecosystem Manager prompt
# to maintain component synchronization across the project

echo "🎨 Syncing BigBlocks components using ecosystem automation..."
echo "✅ Using init-prism v0.0.23 with BigBlocks latest (Vite compatible)"
echo "🚀 Zero TypeScript errors, 96+ enterprise Bitcoin components"

# Auto-detect framework and use appropriate adapter
framework=$(detect_framework)
echo "Detected framework: $framework"

claude -p ~/code/prompts/bigblocks/component-ecosystem-manager.md \
  --project-root="$(pwd)" \
  --target-version="latest" \
  --framework="$framework" \
  --vite-compatible \
  --type-safety-enabled
```

### 2. Meta-Prompt Generation
```bash
# Generated projects can create their own prompts
#!/bin/bash
# automation/generate-project-specific-prompts.sh

# Generate prompts specific to this project's needs
generate_custom_prompt() {
    local prompt_type=$1
    local project_context=$2
    
    # Use InitPRISM Meta-Prompt Generator recursively
    claude -p ~/code/prompts/development/initprism-meta-prompt-generator.md \
      --mode="generate_custom_prompt" \
      --prompt-type="$prompt_type" \
      --project-context="$project_context" \
      --output-path="automation/custom-prompts/"
}
```

### 3. Automation Chain Composition
```yaml
# Projects can chain multiple prompts for complex workflows
automation_chains:
  full_maintenance:
    - "Run system health audit"
    - "Update BigBlocks components"
    - "Sync cross-project dependencies"
    - "Verify blockchain connectivity"
    - "Generate productivity report"
    
  deployment_workflow:
    - "Run security audit"
    - "Test BigBlocks component compatibility"
    - "Verify blockchain transaction flows"
    - "Deploy to staging with health monitoring"
    - "Promote to production with rollback capability"
```

## 📊 Success Metrics & Recursive Value

### Immediate Value (v0.0.23 + BigBlocks Latest)
- **Time to Automation**: Projects generated with automation from day one
- **Component Integration**: 96+ BigBlocks components working immediately with zero TypeScript errors
- **Blockchain Connectivity**: Real BSV functionality with Type 42 Master Keys and BAP Profile Sync
- **Monitoring Coverage**: Health checks and alerts configured automatically
- **Production Quality**: 36% reduction in 'any' types, comprehensive documentation
- **Vite Compatibility**: Full Astro/Vite support without build hanging issues

### Compound Value
- **Automation Multiplication**: Each project adds to ecosystem automation
- **Pattern Evolution**: Better templates generated based on successful patterns
- **Cross-Project Synergy**: Projects coordinate and enhance each other
- **Meta-Evolution**: System generates better automation over time
- **Quality Compounding**: Zero TypeScript errors multiply across all generated projects

### Ecosystem Metrics
- **Projects Generated**: Track InitPRISM projects using prompt inheritance
- **Automation Coverage**: Percentage of ecosystem using prompt-aware patterns
- **Prompt Evolution**: Rate of new prompt generation from existing projects
- **Network Effects**: Cross-project automation coordination success rate

## 🔄 Maintenance & Evolution

### Prompt Repository Sync
- **Automatic Updates**: Projects sync with latest prompt versions
- **Breaking Change Handling**: Graceful migration when prompts evolve
- **New Prompt Discovery**: Projects automatically discover relevant new prompts
- **Contribution Feedback**: Successful patterns contributed back to repository

### Meta-Evolution Patterns
- **Success Pattern Extraction**: Identify successful automation combinations
- **Template Refinement**: Improve templates based on real project outcomes
- **Prompt Generation**: Create new prompts based on common project needs
- **Ecosystem Optimization**: Continuously improve automation effectiveness

## 🚨 Implementation Safeguards

### Recursive Safety
- **Infinite Loop Prevention**: Detect and prevent recursive generation cycles
- **Resource Monitoring**: Track token usage and generation complexity
- **Quality Gates**: Ensure generated projects meet minimum automation standards
- **Rollback Capability**: Safe recovery from failed recursive generations

### Quality Assurance
- **Automation Testing**: Verify all inherited automation actually works
- **Integration Validation**: Test prompt references resolve correctly
- **Performance Monitoring**: Ensure recursive capabilities don't impact performance
- **Security Verification**: Validate all automation meets security standards

---

**This prompt represents the future of software development - where projects are born with intelligence, automation, and the ability to evolve. Every project generated becomes a node in an ever-growing network of automated excellence.**