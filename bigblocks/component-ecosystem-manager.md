# BigBlocks Component Ecosystem Manager

**The Ultimate Automation for Managing 96 Bitcoin UI Components Across Your Entire Development Ecosystem**

## 🎯 Mission

Orchestrate the complete BigBlocks ecosystem - 96 components, CLI tools, registry systems, themes, and framework integrations - across all projects in the monorepo. This prompt implements advanced multi-turn automation, worktree isolation, and intelligent component management.

## 🚀 Core Capabilities

### 1. **Intelligent Component Analysis & Recommendations**
- Analyze all projects to identify BigBlocks usage patterns
- Recommend optimal component combinations for new features
- Detect unused components and optimization opportunities
- Map component dependencies and suggest consolidation

### 2. **Cross-Project Component Synchronization**
- Update component versions across all projects simultaneously
- Handle breaking changes with automated migration assistance
- Test component compatibility across different framework configurations
- Coordinate component updates with dependency management

### 3. **Framework-Agnostic Integration Management**
- Manage Express, Next.js, and Astro adapter configurations
- Test components across all supported frameworks
- Migrate components between frameworks when projects change
- Verify framework-specific optimizations and bundle sizes

### 4. **Advanced Theme & Design System Management**
- Deploy theme updates across all projects
- Test theme compatibility with component combinations
- Generate visual regression tests for theme changes
- Manage the transition to adaptive theming (ShadCN compatibility)

### 5. **Registry & Distribution Orchestration**
- Sync GitHub and experimental blockchain registries
- Validate component integrity across distribution channels
- Manage component publishing and versioning
- Monitor registry health and availability

### 6. **Performance & Bundle Optimization**
- Analyze component usage for bundle size optimization
- Identify redundant component imports across projects
- Generate performance reports with optimization recommendations
- Track component performance metrics over time

## 🧠 Advanced Implementation Pattern

This prompt uses a sophisticated **Multi-Turn StateFlow** architecture with worktree isolation and comprehensive verification loops.

### State Machine Architecture

```yaml
# BigBlocks Component Management State Flow
initial_state: analyze_ecosystem
max_turns: 20
verification_required: true

states:
  analyze_ecosystem:
    description: "Comprehensive analysis of BigBlocks usage across monorepo"
    actions:
      - scan_all_projects_for_bigblocks_usage
      - identify_component_versions_and_configurations
      - analyze_theme_usage_and_consistency
      - check_framework_adapter_configurations
      - map_component_dependencies_and_relationships
    success_transitions:
      - all_current_and_optimized: "optimization_analysis"
      - outdated_components_found: "update_planning"
      - configuration_issues_detected: "configuration_repair"
      - theme_inconsistencies_found: "theme_synchronization"
    error_transitions:
      - analysis_failed: "diagnostic_mode"
    verification:
      - projects_scanned_successfully
      - component_registry_accessible
      - no_critical_configuration_errors

  update_planning:
    description: "Plan component updates with safety and testing"
    actions:
      - create_component_update_worktrees
      - analyze_breaking_changes_in_new_versions
      - generate_migration_plans_for_affected_components
      - identify_testing_requirements_and_dependencies
      - plan_rollback_strategy_and_checkpoints
    success_transitions:
      - safe_update_plan_created: "isolated_testing"
      - breaking_changes_detected: "migration_assistance"
    error_transitions:
      - planning_failed: "manual_intervention_required"
    verification:
      - worktrees_created_successfully
      - migration_plans_comprehensive
      - rollback_strategy_defined

  isolated_testing:
    description: "Test component updates in isolated worktree environments"
    actions:
      - install_new_component_versions_in_test_worktrees
      - run_component_compatibility_tests
      - execute_cross_framework_testing
      - perform_visual_regression_testing
      - validate_bundle_size_and_performance_impact
    success_transitions:
      - all_tests_passed: "coordinated_deployment"
      - minor_issues_detected: "automatic_fixes"
      - major_issues_detected: "issue_resolution"
    error_transitions:
      - testing_infrastructure_failed: "infrastructure_repair"
    verification:
      - test_environments_properly_isolated
      - all_test_suites_executed
      - performance_metrics_within_thresholds

  coordinated_deployment:
    description: "Deploy component updates across projects in dependency order"
    actions:
      - determine_deployment_order_based_on_dependencies
      - deploy_shared_component_updates_first
      - update_consuming_projects_in_sequence
      - verify_cross_project_integration_after_each_deployment
      - update_documentation_and_changelog
    success_transitions:
      - deployment_successful: "verification_and_cleanup"
    error_transitions:
      - deployment_failed: "rollback_procedure"
    verification:
      - all_projects_building_successfully
      - integration_tests_passing
      - no_runtime_errors_detected

  theme_synchronization:
    description: "Synchronize themes and design system across projects"
    actions:
      - analyze_current_theme_usage_across_projects
      - identify_theme_compatibility_issues
      - deploy_updated_theme_configurations
      - test_adaptive_theming_with_shadcn_detection
      - generate_visual_regression_test_results
    success_transitions:
      - themes_synchronized: "verification_and_cleanup"
    error_transitions:
      - theme_conflicts_detected: "theme_conflict_resolution"
    verification:
      - themes_consistent_across_projects
      - visual_regression_tests_passed
      - adaptive_theming_working_correctly

  optimization_analysis:
    description: "Analyze and implement component usage optimizations"
    actions:
      - identify_unused_components_across_projects
      - analyze_component_duplication_and_redundancy
      - generate_bundle_size_optimization_recommendations
      - suggest_component_consolidation_opportunities
      - create_performance_improvement_plan
    success_transitions:
      - optimizations_identified: "optimization_implementation"
      - no_optimizations_needed: "verification_and_cleanup"
    verification:
      - optimization_analysis_complete
      - recommendations_actionable
      - performance_impact_quantified

  verification_and_cleanup:
    description: "Final verification and cleanup of automation results"
    actions:
      - run_comprehensive_integration_tests
      - verify_all_projects_building_and_running
      - cleanup_temporary_worktrees_and_files
      - generate_comprehensive_report
      - update_component_usage_documentation
    success_transitions:
      - all_verified: "complete"
    error_transitions:
      - verification_failed: "issue_resolution"

error_recovery:
  rollback_procedure:
    description: "Safely rollback component changes if deployment fails"
    actions:
      - restore_from_pre_deployment_checkpoints
      - revert_component_versions_to_previous_state
      - cleanup_failed_deployment_artifacts
      - notify_team_of_rollback_and_issues
    
  issue_resolution:
    description: "Resolve issues detected during automation"
    actions:
      - analyze_error_logs_and_failure_points
      - attempt_automatic_fixes_for_common_issues
      - provide_detailed_manual_intervention_guidance
      - create_issue_tickets_for_complex_problems

  manual_intervention_required:
    description: "Escalate to manual intervention with detailed context"
    actions:
      - generate_detailed_failure_analysis_report
      - provide_step_by_step_manual_resolution_guide
      - preserve_all_debugging_information
      - suggest_process_improvements_for_future
```

## 🛠️ Technical Implementation

### Worktree Management Strategy

```bash
# Create component testing worktrees
create_component_test_worktrees() {
    local base_branch=${1:-main}
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Create worktrees for different testing scenarios
    git worktree add "../wt-bigblocks-update-$timestamp" -b "bigblocks/update-$timestamp" "$base_branch"
    git worktree add "../wt-bigblocks-migration-$timestamp" -b "bigblocks/migration-$timestamp" "$base_branch"
    git worktree add "../wt-bigblocks-optimization-$timestamp" -b "bigblocks/optimization-$timestamp" "$base_branch"
    
    # Setup each worktree with proper dependencies
    for worktree in "../wt-bigblocks-"*; do
        setup_worktree_environment "$worktree"
    done
}

setup_worktree_environment() {
    local worktree_path=$1
    cd "$worktree_path"
    
    # Install dependencies
    bun install
    
    # Copy environment configurations
    cp ../.env.example .env.local
    
    # Install BigBlocks CLI
    bunx bigblocks@latest init --typescript --dir ./components/bigblocks
}
```

### Component Analysis Engine

```typescript
// Component ecosystem analysis
interface ComponentAnalysis {
  projects: ProjectComponentUsage[];
  versions: ComponentVersionMap;
  dependencies: ComponentDependencyGraph;
  themes: ThemeUsageAnalysis;
  performance: ComponentPerformanceMetrics;
  opportunities: OptimizationOpportunities;
}

interface ProjectComponentUsage {
  projectName: string;
  projectPath: string;
  framework: 'nextjs' | 'express' | 'astro' | 'unknown';
  bigblocksVersion: string;
  componentsUsed: ComponentUsage[];
  configurationIssues: ConfigurationIssue[];
  bundleSize: BundleSizeAnalysis;
}

interface ComponentUsage {
  componentName: string;
  importPath: string;
  usageCount: number;
  lastUpdated: Date;
  deprecationWarnings: string[];
}
```

### Framework Integration Manager

```typescript
// Framework-specific optimization
class FrameworkIntegrationManager {
  async analyzeFrameworkOptimizations(projectPath: string) {
    const framework = await this.detectFramework(projectPath);
    
    switch (framework) {
      case 'nextjs':
        return this.analyzeNextJSOptimizations(projectPath);
      case 'express':
        return this.analyzeExpressOptimizations(projectPath);
      case 'astro':
        return this.analyzeAstroOptimizations(projectPath);
    }
  }
  
  async optimizeForFramework(projectPath: string, optimizations: Optimization[]) {
    // Apply framework-specific optimizations
    // Update webpack configs, imports, component usage
  }
}
```

## 📋 Prerequisites & Setup

### Required Tools & Dependencies
- **Claude Code** - For multi-turn automation execution
- **Git worktrees** - For isolated testing environments
- **BigBlocks CLI** - Component management (`bunx bigblocks@latest`)
- **Bun** - Package management and build tools
- **Node.js 18+** - Runtime environment

### Environment Variables
```bash
# Optional: Enable blockchain registry (experimental)
export BIGBLOCKS_WIF="your-private-key-wif"

# Required: API access for component registries
export GITHUB_TOKEN="your-github-token"

# Optional: Enable advanced analytics
export BIGBLOCKS_ANALYTICS_ENABLED="true"
```

### Project Structure Requirements
```
monorepo/
├── package.json                    # Root workspace configuration
├── projects/
│   ├── next-app/                  # Next.js applications
│   ├── express-api/               # Express services
│   └── astro-site/               # Astro sites
└── shared/
    └── components/               # Shared component library
```

## 🎯 Usage Scenarios

### Scenario 1: Component Version Update
```bash
# Prompt execution
claude -p prompts/bigblocks/component-ecosystem-manager.md

# User intent
"Update BigBlocks to v0.0.12 across all projects and test compatibility"
```

**Automation Flow:**
1. **Analysis**: Scan all projects for BigBlocks usage
2. **Planning**: Create update worktrees and analyze breaking changes
3. **Testing**: Isolated testing in worktree environments
4. **Deployment**: Coordinated rollout across projects
5. **Verification**: Integration testing and cleanup

### Scenario 2: Framework Migration
```bash
# User intent
"Migrate authentication components from Next.js to Astro in the marketing site"
```

**Automation Flow:**
1. **Analysis**: Identify components used in Next.js project
2. **Migration Planning**: Map Next.js components to Astro equivalents
3. **Framework Setup**: Configure Astro BigBlocks integration
4. **Component Migration**: Update imports and configurations
5. **Testing**: Verify functionality in Astro environment

### Scenario 3: Theme System Upgrade
```bash
# User intent
"Deploy the new adaptive theming system and test ShadCN compatibility"
```

**Automation Flow:**
1. **Theme Analysis**: Scan current theme usage across projects
2. **Compatibility Testing**: Test adaptive theming with ShadCN detection
3. **Visual Regression**: Generate and compare visual tests
4. **Deployment**: Roll out theme updates safely
5. **Verification**: Ensure consistent theming across all projects

### Scenario 4: Performance Optimization
```bash
# User intent
"Optimize BigBlocks component usage for bundle size and identify unused components"
```

**Automation Flow:**
1. **Usage Analysis**: Map component usage across all projects
2. **Bundle Analysis**: Analyze webpack bundle sizes and component impact
3. **Optimization Planning**: Identify removal and consolidation opportunities
4. **Implementation**: Remove unused components and optimize imports
5. **Performance Verification**: Measure and report improvements

## 📊 Success Metrics & Reporting

### Quantitative Metrics
- **Component Coverage**: % of projects using optimal BigBlocks components
- **Version Consistency**: % of projects on latest compatible versions
- **Bundle Size Reduction**: Measured improvement in application bundle sizes
- **Update Velocity**: Time reduced for component updates across projects
- **Test Coverage**: % of component integrations with automated tests

### Qualitative Metrics
- **Developer Experience**: Feedback on component integration ease
- **Design Consistency**: Visual consistency across applications
- **Maintenance Efficiency**: Reduced time spent on component management
- **Innovation Enablement**: More time available for feature development

### Automated Reporting
```typescript
// Generate comprehensive ecosystem report
interface EcosystemReport {
  timestamp: Date;
  projects: {
    total: number;
    usingBigBlocks: number;
    upToDate: number;
    needingAttention: number;
  };
  components: {
    totalAvailable: number;
    totalUsed: number;
    averageUsagePerProject: number;
    mostPopularComponents: string[];
  };
  performance: {
    averageBundleSize: string;
    bundleSizeReduction: string;
    buildTimeImpact: string;
  };
  recommendations: OptimizationRecommendation[];
}
```

## 🔄 Maintenance & Evolution

### Continuous Monitoring
- **Weekly Component Health Checks**: Automated scans for outdated components
- **Performance Baseline Tracking**: Monitor bundle size and build time trends  
- **Registry Synchronization**: Keep GitHub and blockchain registries in sync
- **Breaking Change Alerts**: Early warning system for component updates

### Evolution Strategy
- **Component Usage Analytics**: Track adoption patterns to guide development
- **Framework Support Expansion**: Add support for new frameworks as needed
- **Advanced Optimization**: ML-powered component recommendation engine
- **Integration Expansion**: Connect with more development tools and workflows

## 🚨 Error Handling & Recovery

### Common Issues & Solutions
1. **Component Version Conflicts**: Automatic resolution with dependency analysis
2. **Framework Compatibility Issues**: Rollback to previous working state
3. **Theme Conflicts**: Intelligent theme merging and conflict resolution
4. **Registry Unavailability**: Fallback to local component cache
5. **Build Failures**: Automatic retry with incremental fixes

### Rollback Procedures
- **Checkpoint System**: Automatic snapshots before major changes
- **Worktree Isolation**: Failed changes contained in test worktrees
- **Dependency Restoration**: Automatic restoration of previous working state
- **Team Notification**: Automated alerts for failed operations

---

## 🎯 Get Started

1. **Initialize**: Set up the prompts repository and required tools
2. **Configure**: Set environment variables and validate project structure
3. **Execute**: Run the prompt with your specific component management needs
4. **Monitor**: Review automation reports and success metrics
5. **Iterate**: Use insights to optimize component usage and workflows

**This prompt represents the cutting edge of component ecosystem management, combining advanced AI automation, worktree workflows, and comprehensive testing to manage 96 Bitcoin UI components across your entire development ecosystem.**