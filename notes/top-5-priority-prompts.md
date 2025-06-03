# Top 5 Priority Prompts - Implementation Plan

Based on analysis of the ecosystem and immediate value potential, here are the 5 highest priority prompts to implement first.

## 1. System Health Audit 🏥
**File**: `server/system-health-audit.md`
**Priority**: Critical
**Estimated Value**: Extremely High

### Description
Comprehensive health check across all infrastructure components, services, and monitoring systems. Generates actionable reports with immediate issue identification.

### Why This First?
- **Immediate Value**: Identifies urgent issues requiring attention
- **Foundation**: Establishes baseline for all other monitoring
- **Risk Mitigation**: Prevents catastrophic failures through early detection
- **Ecosystem Wide**: Benefits every project and service

### Key Capabilities
- Server resource monitoring (CPU, memory, disk, network)
- Service health checks across all applications
- Database performance analysis
- Log aggregation and error pattern detection
- Security posture assessment
- Backup system verification
- Performance baseline establishment

### Implementation Approach
- Leverage agent-master for MCP coordination
- Use satchmo-watch data for development activity insights
- Integrate with existing logging and monitoring systems
- Generate both immediate alerts and comprehensive reports

---

## 2. Cross-Project Dependency Update 🚀
**File**: `development/cross-project-dependency-update.md`
**Priority**: Critical
**Estimated Value**: Very High

### Description
Automated dependency updates across the entire monorepo with intelligent testing, conflict resolution, and coordinated deployment.

### Why Second?
- **Security Critical**: Keeps all projects secure with latest patches
- **Development Velocity**: Prevents dependency drift and integration issues
- **Time Saving**: Manual updates across 50+ projects is extremely time-consuming
- **Quality Assurance**: Automated testing ensures updates don't break functionality

### Key Capabilities
- Scan all projects for outdated dependencies
- Intelligent update strategy (patch vs minor vs major)
- Automated testing after updates
- Conflict resolution and compatibility checking
- Coordinated deployment across related projects
- Rollback procedures for failed updates

### Implementation Approach
- Use init-prism intelligence for project type detection
- Leverage existing CI/CD pipelines for testing
- Coordinate with agent-master for tool synchronization
- Generate detailed reports on update impact

---

## 3. BSV Network Health Monitor ⛓️
**File**: `blockchain/bsv-network-health-monitor.md`
**Priority**: Critical
**Estimated Value**: Very High

### Description
Real-time monitoring of BSV network status with intelligent alerting for network issues, fee changes, and transaction problems.

### Why Third?
- **Business Critical**: Applications depend on BSV network availability
- **User Experience**: Network issues directly impact user transactions
- **Cost Management**: Fee monitoring prevents unexpected cost spikes
- **Proactive Response**: Early warning allows proactive issue resolution

### Key Capabilities
- Network status monitoring (blocks, mempool, fees)
- Transaction broadcasting success rates
- Wallet connectivity and sync status
- Fee optimization recommendations
- Network congestion alerts
- Historical trend analysis
- Integration with bsv-mcp tools

### Implementation Approach
- Leverage bsv-mcp blockchain tools and utilities
- Use WhatsOnChain API for network data
- Integrate with transaction monitoring systems
- Real-time dashboard with WebSocket updates

---

## 4. Developer Productivity Dashboard 📊
**File**: `analytics/developer-productivity-dashboard.md`
**Priority**: High
**Estimated Value**: High

### Description
Comprehensive analytics dashboard combining satchmo-watch data with project metrics to provide insights into development patterns and productivity.

### Why Fourth?
- **Team Optimization**: Identifies bottlenecks and improvement opportunities
- **Data-Driven Decisions**: Provides metrics for planning and resource allocation
- **Individual Growth**: Helps developers understand their own patterns
- **Project Health**: Connects activity to project outcomes

### Key Capabilities
- Activity pattern analysis from satchmo-watch
- Code quality correlation with productivity metrics
- Project velocity tracking across repositories
- Context switching impact analysis
- Build time and success rate correlation
- Team collaboration pattern insights
- Productivity trend identification

### Implementation Approach
- Integrate satchmo-watch SQLite data
- Combine with git history analysis
- Use project health metrics from CI/CD systems
- Real-time dashboard with historical trends

---

## 5. Multi-Environment Deployment 🔧
**File**: `infrastructure/multi-environment-deployment.md`
**Priority**: High
**Estimated Value**: High

### Description
Orchestrated deployment automation across development, staging, and production environments with intelligent rollback and health verification.

### Why Fifth?
- **Risk Reduction**: Coordinated deployments reduce deployment failures
- **Consistency**: Ensures all environments stay in sync
- **Speed**: Automated deployments are faster and more reliable
- **Audit Trail**: Complete deployment history and rollback capabilities

### Key Capabilities
- Environment-aware deployment strategies
- Pre-deployment health checks
- Coordinated database migrations
- Service dependency management
- Automated rollback on failure
- Deployment success verification
- Configuration drift detection

### Implementation Approach
- Leverage existing CI/CD pipelines
- Coordinate with container orchestration
- Use infrastructure-as-code for consistency
- Integration with monitoring for health verification

---

## Implementation Timeline

### Week 1: System Health Audit
- Most critical for immediate infrastructure safety
- Establishes monitoring foundation for other prompts
- Provides baseline metrics for performance comparisons

### Week 2: Cross-Project Dependency Update  
- Critical security and maintenance task
- Improves development velocity for subsequent work
- Ensures all projects are on stable, secure dependencies

### Week 3: BSV Network Health Monitor
- Critical for blockchain application reliability
- Provides data needed for optimization decisions
- Integrates with existing bsv-mcp infrastructure

### Week 4: Developer Productivity Dashboard
- Builds on established monitoring infrastructure
- Provides metrics for evaluating prompt effectiveness
- Helps optimize development workflows

### Week 5: Multi-Environment Deployment
- Leverages improved dependency management from week 2
- Uses health monitoring established in week 1
- Provides reliable deployment for future prompt rollouts

## Success Metrics

Each prompt will be evaluated on:
- **Time Saved**: Hours saved per week through automation
- **Issue Prevention**: Number of issues caught before production
- **Developer Satisfaction**: Team feedback on utility and usability
- **Reliability Improvement**: Reduction in deployment failures and incidents
- **Visibility Increase**: Improved insight into system status and trends

## Next Steps

After implementing these 5 critical prompts:
1. **Security Audit Automation** - Build on health monitoring
2. **Project Health Scorecard** - Expand analytics capabilities  
3. **Agent Master Configuration Sync** - Leverage deployment automation
4. **Performance Baseline Report** - Use established monitoring data
5. **Release Coordination** - Build on deployment orchestration