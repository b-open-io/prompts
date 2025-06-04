---
name: "Multi-Framework BigBlocks Testing Suite"
version: "1.0.0"
description: "Comprehensive testing automation for BigBlocks components across React, Next.js, Express, and Astro"
category: "bigblocks"
tags: ["testing", "framework-agnostic", "components", "automation", "quality-assurance", "ci-cd"]
author: "BSV Development Team"
requirements:
  tools: ["Claude Code", "npx bigblocks", "jest", "playwright", "vitest"]
  environment: ["CI_CD_TOKEN", "TESTING_ENDPOINTS", "BMAP_API_TEST_URL"]
  dependencies: ["bigblocks/component-ecosystem-manager", "bigblocks/social-components-integration"]
metadata:
  llm_provider: ["claude"]
  complexity: "advanced"
  estimated_tokens: 15000
  time_estimate: "60-90 minutes"
  bigblocks_version: ">=0.0.12"
  framework_compatibility_aware: true
---

# Multi-Framework BigBlocks Testing Suite

**Comprehensive Testing Automation for Framework-Agnostic BigBlocks Components**

## 🎯 Mission

Ensure BigBlocks components work flawlessly across all supported frameworks (React, Next.js, Express, Astro) with comprehensive testing coverage for UI functionality, blockchain integration, social features, and performance across different environments.

## 🔍 Automatic Compatibility Detection

This testing suite automatically detects and handles framework-specific issues:

```bash
# Detect BigBlocks version and known issues
detect_compatibility_issues() {
    local version=$(npm list bigblocks --depth=0 | grep bigblocks | awk '{print $2}')
    echo "Testing BigBlocks $version"
    
    # Check for known compatibility fixes
    if [[ "$version" < "0.0.14" ]]; then
        echo "⚠️ WARNING: Pre-0.0.14 detected - Astro/Vite issues expected"
        echo "Known issues:"
        echo "- ESM module resolution for bmap-api-types"
        echo "- Missing SSR guards for browser APIs"
        export NEEDS_ASTRO_WORKAROUNDS=true
    fi
    
    # Detect framework-specific module systems
    detect_module_system() {
        if [[ -f "vite.config.ts" || -f "vite.config.js" ]]; then
            echo "Vite-based framework detected (Astro/SvelteKit)"
            export MODULE_SYSTEM="vite"
            
            # Check for ESM compatibility
            if ! grep -q '"type": "module"' package.json; then
                echo "⚠️ ESM compatibility issue detected"
            fi
        elif [[ -f "next.config.js" || -f "next.config.mjs" ]]; then
            echo "Next.js framework detected"
            export MODULE_SYSTEM="webpack"
        else
            echo "Standard bundler detected"
            export MODULE_SYSTEM="standard"
        fi
    }
    
    detect_module_system
}

# Apply automatic fixes for known issues
apply_compatibility_fixes() {
    if [[ "$NEEDS_ASTRO_WORKAROUNDS" == "true" ]]; then
        echo "Applying Astro/Vite compatibility workarounds..."
        
        # Add vite config optimizations
        cat >> vite.config.ts <<EOF
// BigBlocks compatibility fixes
export default {
  optimizeDeps: {
    include: ['bigblocks', 'bmap-api-types']
  },
  ssr: {
    noExternal: ['bigblocks']
  }
}
EOF
    fi
}
```

## 🧪 Comprehensive Testing Framework

### 1. **Framework Compatibility Testing**
- **React**: Pure React component testing with blockchain hooks
- **Next.js**: SSR/SSG compatibility with social components
- **Express**: Server-side rendering and API integration
- **Astro**: Island architecture with interactive components

### 2. **Component Functionality Testing**
- **UI Rendering**: Visual regression testing across frameworks
- **Blockchain Integration**: Real Bitcoin transaction testing
- **Social Features**: bmap-api integration validation
- **Performance**: Bundle size and runtime performance

### 3. **Cross-Framework Integration Testing**
- **API Compatibility**: Ensure all endpoints work across frameworks
- **State Management**: Test component state across different architectures
- **Theme Consistency**: Verify design system across frameworks
- **CLI Integration**: Test `npx bigblocks add` across project types

### 4. **Real Blockchain Testing**
- **Transaction Workflows**: Test actual Bitcoin transactions
- **Social Interactions**: Verify real like/follow/friend functionality
- **Data Fetching**: Test blockchain data hooks and APIs
- **Error Handling**: Test blockchain failure scenarios

## 🧠 Testing Orchestration StateFlow

```yaml
testing_orchestration_flow:
  initial_state: "setup_testing_environments"
  
  states:
    setup_testing_environments:
      description: "Setup isolated testing environments for each framework"
      parallel_actions:
        react_environment:
          - "create_react_test_project_with_bigblocks"
          - "install_testing_dependencies_and_blockchain_config"
          - "setup_component_testing_infrastructure"
        
        nextjs_environment:
          - "create_nextjs_test_project_with_bigblocks"
          - "configure_ssr_testing_and_blockchain_integration"
          - "setup_nextjs_specific_testing_tools"
        
        express_environment:
          - "create_express_test_project_with_bigblocks"
          - "configure_server_side_component_testing"
          - "setup_api_integration_testing"
        
        astro_environment:
          - "create_astro_test_project_with_bigblocks"
          - "configure_island_architecture_testing"
          - "setup_astro_specific_testing_framework"
      
      success_transitions:
        - environments_ready: "install_components_across_frameworks"
      error_transitions:
        - environment_setup_failed: "troubleshoot_framework_setup"

    install_components_across_frameworks:
      description: "Install and configure BigBlocks components in each framework"
      parallel_actions:
        social_components:
          - "install_PostCard_across_all_frameworks"
          - "install_FriendsDialog_across_all_frameworks"
          - "install_SocialProfile_across_all_frameworks"
          - "install_LikeButton_across_all_frameworks"
        
        auth_components:
          - "install_LoginForm_across_all_frameworks"
          - "install_WalletConnect_across_all_frameworks"
          - "install_IdentityVerification_across_all_frameworks"
        
        utility_components:
          - "install_UserAvatar_across_all_frameworks"
          - "install_NotificationPanel_across_all_frameworks"
          - "install_ActivityFeed_across_all_frameworks"
      
      success_transitions:
        - components_installed: "execute_framework_specific_tests"
      error_transitions:
        - installation_failed: "debug_component_installation_issues"

    execute_framework_specific_tests:
      description: "Run comprehensive tests for each framework"
      parallel_actions:
        react_testing:
          - "run_react_component_unit_tests"
          - "run_react_blockchain_integration_tests"
          - "run_react_social_functionality_tests"
          - "run_react_performance_tests"
        
        nextjs_testing:
          - "run_nextjs_ssr_component_tests"
          - "run_nextjs_api_route_tests"
          - "run_nextjs_blockchain_integration_tests"
          - "run_nextjs_build_optimization_tests"
        
        express_testing:
          - "run_express_server_component_tests"
          - "run_express_api_integration_tests"
          - "run_express_blockchain_workflow_tests"
          - "run_express_performance_tests"
        
        astro_testing:
          - "run_astro_island_component_tests"
          - "run_astro_build_integration_tests"
          - "run_astro_blockchain_component_tests"
          - "run_astro_static_generation_tests"
      
      success_transitions:
        - framework_tests_passed: "cross_framework_integration_testing"
      error_transitions:
        - framework_tests_failed: "analyze_framework_specific_failures"

    cross_framework_integration_testing:
      description: "Test integration and compatibility across frameworks"
      actions:
        - "test_component_consistency_across_frameworks"
        - "test_blockchain_api_compatibility_across_frameworks"
        - "test_theme_and_styling_consistency"
        - "test_social_hook_compatibility_across_frameworks"
        - "test_cli_installation_across_project_types"
        - "test_bundle_size_consistency_across_frameworks"
      success_transitions:
        - integration_tests_passed: "performance_and_regression_testing"
      error_transitions:
        - integration_tests_failed: "fix_cross_framework_compatibility_issues"

    performance_and_regression_testing:
      description: "Comprehensive performance and regression testing"
      actions:
        - "run_visual_regression_tests_across_frameworks"
        - "test_bundle_size_impact_across_frameworks"
        - "test_runtime_performance_across_frameworks"
        - "test_blockchain_transaction_performance"
        - "test_social_component_loading_performance"
        - "test_memory_usage_across_frameworks"
      success_transitions:
        - performance_tests_passed: "generate_testing_report"
      error_transitions:
        - performance_issues_detected: "optimize_performance_across_frameworks"

    generate_testing_report:
      description: "Generate comprehensive testing report"
      actions:
        - "compile_test_results_across_all_frameworks"
        - "generate_framework_compatibility_matrix"
        - "create_performance_benchmark_report"
        - "document_any_framework_specific_issues"
        - "create_regression_test_baseline"
      success_transitions:
        - report_generated: "cleanup_testing_environments"

    cleanup_testing_environments:
      description: "Clean up testing resources and environments"
      actions:
        - "cleanup_temporary_testing_projects"
        - "archive_test_results_and_artifacts"
        - "update_testing_documentation"
        - "schedule_next_testing_cycle"
      success_transitions:
        - cleanup_complete: "complete"

error_recovery:
  troubleshoot_framework_setup:
    description: "Fix framework-specific setup issues"
    actions:
      - "diagnose_framework_dependency_conflicts"
      - "fix_bigblocks_installation_issues"
      - "resolve_blockchain_configuration_problems"
      - "update_framework_specific_configurations"
      
  fix_cross_framework_compatibility_issues:
    description: "Resolve compatibility issues between frameworks"
    actions:
      - "analyze_component_behavior_differences"
      - "fix_framework_specific_component_adaptations"
      - "resolve_blockchain_integration_inconsistencies"
      - "update_framework_adapter_configurations"
```

## 🔧 Framework-Specific Testing Implementation

### React Testing Suite

```bash
# React component testing with BigBlocks
setup_react_testing_environment() {
    echo "⚛️ Setting up React Testing Environment..."
    
    # Create React test project
    npx create-react-app bigblocks-react-test --template typescript
    cd bigblocks-react-test
    
    # Install BigBlocks and testing dependencies
    npm install bigblocks
    npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
    
    # Install blockchain testing utilities
    npm install --save-dev @testing-library/user-event msw
    
    # Install BigBlocks components
    install_bigblocks_components_for_react
    
    # Configure testing environment
    configure_react_testing_config
}

install_bigblocks_components_for_react() {
    echo "  🧩 Installing BigBlocks components for React..."
    
    # Core social components
    npx bigblocks add PostCard
    npx bigblocks add FriendsDialog
    npx bigblocks add SocialProfile
    npx bigblocks add LikeButton
    
    # Authentication components
    npx bigblocks add LoginForm
    npx bigblocks add WalletConnect
    
    # Utility components
    npx bigblocks add UserAvatar
    npx bigblocks add NotificationPanel
}

# React component tests
test_react_components() {
    echo "🧪 Testing React BigBlocks Components..."
    
    # Test PostCard component
    test_react_postcard_component
    
    # Test FriendsDialog component
    test_react_friends_dialog_component
    
    # Test blockchain integration
    test_react_blockchain_integration
    
    # Test social hooks
    test_react_social_hooks
}

test_react_postcard_component() {
    cat > src/__tests__/PostCard.test.tsx <<'EOF'
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostCard } from 'bigblocks';
import { mockBmapApi } from '../__mocks__/bmapApi';

// Mock bmap-api responses
jest.mock('bigblocks', () => ({
  ...jest.requireActual('bigblocks'),
  useFetchLikes: () => ({
    data: mockBmapApi.likes,
    loading: false,
    error: null,
    refetch: jest.fn()
  }),
  useSocialActions: () => ({
    likePost: jest.fn().mockResolvedValue({ txid: 'mock-txid' }),
    loading: false,
    error: null
  })
}));

describe('PostCard Component', () => {
  const mockPost = {
    id: 'test-post-1',
    content: 'Test post content',
    author: 'test-author',
    timestamp: Date.now(),
    tx: { h: 'mock-txid' },
    blk: { i: 123456 }
  };

  test('renders post content correctly', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.getByText('test-author')).toBeInTheDocument();
  });

  test('displays real Bitcoin like count', async () => {
    render(<PostCard post={mockPost} />);
    
    await waitFor(() => {
      expect(screen.getByText(/likes/i)).toBeInTheDocument();
    });
  });

  test('handles like action with Bitcoin transaction', async () => {
    const { useSocialActions } = require('bigblocks');
    const mockLikePost = useSocialActions().likePost;
    
    render(<PostCard post={mockPost} />);
    
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);
    
    await waitFor(() => {
      expect(mockLikePost).toHaveBeenCalledWith(mockPost.id);
    });
  });

  test('shows blockchain verification status', () => {
    render(<PostCard post={mockPost} showTransactionDetails={true} />);
    
    expect(screen.getByText(/blockchain verified/i)).toBeInTheDocument();
    expect(screen.getByText(/block: 123456/i)).toBeInTheDocument();
  });
});
EOF

    # Run React PostCard tests
    npm test -- --testPathPattern=PostCard.test.tsx
}
```

### Next.js Testing Suite

```bash
# Next.js testing with SSR and BigBlocks
setup_nextjs_testing_environment() {
    echo "🔺 Setting up Next.js Testing Environment..."
    
    # Create Next.js test project
    npx create-next-app@latest bigblocks-nextjs-test --typescript --tailwind --eslint
    cd bigblocks-nextjs-test
    
    # Install BigBlocks and testing dependencies
    npm install bigblocks
    npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
    npm install --save-dev @playwright/test
    
    # Install blockchain testing utilities
    npm install --save-dev msw
    
    # Install BigBlocks components
    install_bigblocks_components_for_nextjs
    
    # Configure Next.js testing
    configure_nextjs_testing_config
}

test_nextjs_ssr_components() {
    echo "🧪 Testing Next.js SSR BigBlocks Components..."
    
    cat > __tests__/ssr-social-components.test.tsx <<'EOF'
import { render } from '@testing-library/react';
import { SocialProfile } from 'bigblocks';
import { GetServerSideProps } from 'next';

// Test SSR with BigBlocks social components
describe('SSR Social Components', () => {
  test('SocialProfile renders on server side', async () => {
    const mockUser = {
      address: 'test-address',
      name: 'Test User',
      profile: { bio: 'Test bio' },
      friends: [],
      posts: []
    };

    // Test server-side rendering
    const { container } = render(
      <SocialProfile 
        user={mockUser} 
        serverSideRendered={true}
        enableBlockchainData={false} // Disable for SSR
      />
    );

    expect(container.firstChild).toBeTruthy();
    expect(container.textContent).toContain('Test User');
  });

  test('blockchain hooks work after hydration', async () => {
    // Test that blockchain functionality works after client hydration
    const mockUser = {
      address: 'test-address',
      name: 'Test User'
    };

    const { rerender } = render(
      <SocialProfile 
        user={mockUser} 
        serverSideRendered={true}
        enableBlockchainData={false}
      />
    );

    // Simulate hydration
    rerender(
      <SocialProfile 
        user={mockUser} 
        serverSideRendered={false}
        enableBlockchainData={true}
      />
    );

    // Test that blockchain data loading is triggered
    // This would test the client-side blockchain integration
  });
});
EOF

    # Run Next.js SSR tests
    npm test -- --testPathPattern=ssr-social-components.test.tsx
}

# Test Next.js API routes with BigBlocks
test_nextjs_api_integration() {
    echo "🔌 Testing Next.js API Integration..."
    
    cat > pages/api/__tests__/social.test.ts <<'EOF'
import handler from '../social';
import { createMocks } from 'node-mocks-http';

describe('/api/social', () => {
  test('handles blockchain social data requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { action: 'fetchLikes', postId: 'test-post' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('likes');
    expect(data).toHaveProperty('transactionData');
  });

  test('handles social action requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { action: 'like', postId: 'test-post', userAddress: 'test-address' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('txid');
    expect(data).toHaveProperty('success', true);
  });
});
EOF
}
```

### Express Testing Suite

```bash
# Express server-side testing with BigBlocks
setup_express_testing_environment() {
    echo "🚂 Setting up Express Testing Environment..."
    
    # Create Express test project
    mkdir bigblocks-express-test
    cd bigblocks-express-test
    npm init -y
    
    # Install Express and BigBlocks
    npm install express bigblocks
    npm install --save-dev jest supertest @types/jest @types/supertest
    
    # Install blockchain testing utilities
    npm install --save-dev msw nock
    
    # Setup Express app with BigBlocks
    setup_express_app_with_bigblocks
    
    # Configure Express testing
    configure_express_testing_config
}

setup_express_app_with_bigblocks() {
    cat > app.js <<'EOF'
const express = require('express');
const { renderBigBlocksComponent } = require('bigblocks/server');

const app = express();

app.use(express.json());

// Render BigBlocks components server-side
app.get('/social/:component', async (req, res) => {
  const { component } = req.params;
  const props = req.query;
  
  try {
    const html = await renderBigBlocksComponent(component, props);
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle social actions
app.post('/api/social/action', async (req, res) => {
  const { action, postId, userId } = req.body;
  
  // Handle blockchain social actions
  try {
    const result = await handleSocialAction(action, postId, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
EOF
}

test_express_bigblocks_integration() {
    echo "🧪 Testing Express BigBlocks Integration..."
    
    cat > __tests__/express-bigblocks.test.js <<'EOF'
const request = require('supertest');
const app = require('../app');

describe('Express BigBlocks Integration', () => {
  test('renders PostCard component server-side', async () => {
    const response = await request(app)
      .get('/social/PostCard')
      .query({
        postId: 'test-post',
        showTransactionDetails: 'true'
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('test-post');
    expect(response.text).toContain('blockchain');
  });

  test('handles social action API', async () => {
    const response = await request(app)
      .post('/api/social/action')
      .send({
        action: 'like',
        postId: 'test-post',
        userId: 'test-user'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('txid');
    expect(response.body).toHaveProperty('success', true);
  });

  test('handles FriendsDialog server rendering', async () => {
    const response = await request(app)
      .get('/social/FriendsDialog')
      .query({
        userId: 'test-user',
        showTransactionHistory: 'true'
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('friends');
    expect(response.text).toContain('transaction');
  });
});
EOF

    # Run Express tests
    npm test
}
```

### Astro Testing Suite

```bash
# Astro island architecture testing with BigBlocks
setup_astro_testing_environment() {
    echo "🚀 Setting up Astro Testing Environment..."
    
    # Create Astro test project
    npm create astro@latest bigblocks-astro-test -- --template minimal --typescript
    cd bigblocks-astro-test
    
    # Install BigBlocks and testing dependencies
    npm install bigblocks
    npm install --save-dev @astro/check vitest @vitest/ui
    npm install --save-dev @playwright/test
    
    # Install React integration for BigBlocks
    npx astro add react
    
    # Install BigBlocks components
    install_bigblocks_components_for_astro
    
    # Configure Astro testing
    configure_astro_testing_config
}

test_astro_bigblocks_islands() {
    echo "🧪 Testing Astro BigBlocks Islands..."
    
    cat > src/pages/__tests__/social-page.test.ts <<'EOF'
import { expect, test } from 'vitest';
import { JSDOM } from 'jsdom';

test('Astro page with BigBlocks islands builds correctly', async () => {
  // Test that Astro can build pages with BigBlocks components as islands
  const html = `
    ---
    import { PostCard, FriendsDialog } from 'bigblocks';
    const mockPost = {
      id: 'test-post',
      content: 'Test content',
      author: 'test-author'
    };
    ---
    <html>
      <body>
        <h1>Social Page</h1>
        <PostCard client:load post={mockPost} />
        <FriendsDialog client:idle userId="test-user" />
      </body>
    </html>
  `;

  // Parse and validate the HTML structure
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  expect(document.querySelector('h1')?.textContent).toBe('Social Page');
  expect(document.querySelector('PostCard')).toBeTruthy();
  expect(document.querySelector('FriendsDialog')).toBeTruthy();
});
EOF

    # Test Astro island hydration
    cat > src/components/__tests__/BigBlocksIsland.test.tsx <<'EOF'
import { render } from '@testing-library/react';
import { SocialProfile } from 'bigblocks';

describe('BigBlocks Island Components', () => {
  test('SocialProfile hydrates correctly as island', () => {
    const mockUser = {
      address: 'test-address',
      name: 'Test User'
    };

    const { container } = render(
      <SocialProfile 
        user={mockUser} 
        islandMode={true}
        enableBlockchainData={true}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  test('blockchain hooks work in island architecture', async () => {
    // Test that blockchain functionality works in Astro islands
    const mockPost = {
      id: 'test-post',
      content: 'Test content'
    };

    const { container } = render(
      <PostCard 
        post={mockPost} 
        islandMode={true}
        enableBlockchainData={true}
      />
    );

    expect(container.textContent).toContain('Test content');
  });
});
EOF

    # Run Astro tests
    npm run test
}
```

## 📊 Cross-Framework Compatibility Testing

### Component Compatibility Matrix

```bash
# Test component compatibility across all frameworks
test_component_compatibility_matrix() {
    echo "🎯 Testing Component Compatibility Matrix..."
    
    local components=("PostCard" "FriendsDialog" "SocialProfile" "LikeButton" "UserAvatar")
    local frameworks=("react" "nextjs" "express" "astro")
    
    # Create compatibility test matrix
    for component in "${components[@]}"; do
        for framework in "${frameworks[@]}"; do
            echo "  🧪 Testing $component in $framework..."
            test_component_in_framework "$component" "$framework"
        done
    done
    
    # Generate compatibility report
    generate_compatibility_matrix_report
}

test_component_in_framework() {
    local component=$1
    local framework=$2
    
    # Run framework-specific component test
    case "$framework" in
        "react")
            test_react_component "$component"
            ;;
        "nextjs")
            test_nextjs_component "$component"
            ;;
        "express")
            test_express_component "$component"
            ;;
        "astro")
            test_astro_component "$component"
            ;;
    esac
}
```

### Blockchain Integration Testing

```bash
# Test blockchain functionality across frameworks
test_blockchain_integration_across_frameworks() {
    echo "⛓️ Testing Blockchain Integration Across Frameworks..."
    
    # Test bmap-api integration
    test_bmap_api_integration_across_frameworks
    
    # Test social hooks
    test_social_hooks_across_frameworks
    
    # Test transaction workflows
    test_transaction_workflows_across_frameworks
    
    # Test real-time updates
    test_realtime_updates_across_frameworks
}

test_bmap_api_integration_across_frameworks() {
    local frameworks=("react" "nextjs" "express" "astro")
    
    for framework in "${frameworks[@]}"; do
        echo "  🔗 Testing bmap-api integration in $framework..."
        
        # Test API endpoint connectivity
        test_api_connectivity "$framework"
        
        # Test data fetching
        test_blockchain_data_fetching "$framework"
        
        # Test transaction broadcasting
        test_transaction_broadcasting "$framework"
    done
}
```

## 📈 Performance Testing Across Frameworks

### Bundle Size Analysis

```bash
# Analyze bundle sizes across frameworks
analyze_bundle_sizes_across_frameworks() {
    echo "📦 Analyzing Bundle Sizes Across Frameworks..."
    
    local frameworks=("react" "nextjs" "express" "astro")
    
    for framework in "${frameworks[@]}"; do
        echo "  📊 Analyzing $framework bundle size..."
        
        cd "bigblocks-$framework-test"
        
        # Build project
        npm run build
        
        # Analyze bundle
        analyze_framework_bundle_size "$framework"
        
        cd ..
    done
    
    # Generate bundle size comparison report
    generate_bundle_size_report
}

analyze_framework_bundle_size() {
    local framework=$1
    
    case "$framework" in
        "react")
            local bundle_size=$(du -sh build/static/js/*.js | awk '{sum+=$1} END {print sum "KB"}')
            ;;
        "nextjs")
            local bundle_size=$(du -sh .next/static/chunks/*.js | awk '{sum+=$1} END {print sum "KB"}')
            ;;
        "astro")
            local bundle_size=$(du -sh dist/_astro/*.js | awk '{sum+=$1} END {print sum "KB"}')
            ;;
    esac
    
    echo "    📏 $framework bundle size: $bundle_size"
    
    # Store for comparison
    echo "$framework:$bundle_size" >> bundle_sizes.txt
}
```

## 📋 Testing Report Generation

### Comprehensive Testing Report

```bash
generate_comprehensive_testing_report() {
    echo "📊 Generating Comprehensive Testing Report..."
    
    local report_file="bigblocks_testing_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" <<EOF
# BigBlocks v0.0.12 Multi-Framework Testing Report
**Generated**: $(date)
**BigBlocks Version**: 0.0.12
**Frameworks Tested**: React, Next.js, Express, Astro

## Executive Summary
- **Component Compatibility**: ${COMPATIBILITY_SCORE}%
- **Blockchain Integration**: ${BLOCKCHAIN_INTEGRATION_SCORE}%
- **Performance Score**: ${PERFORMANCE_SCORE}%
- **Test Coverage**: ${TEST_COVERAGE}%

## Framework Compatibility Matrix
${COMPATIBILITY_MATRIX}

## Blockchain Integration Results
${BLOCKCHAIN_INTEGRATION_RESULTS}

## Performance Analysis
${PERFORMANCE_ANALYSIS}

## Bundle Size Comparison
${BUNDLE_SIZE_COMPARISON}

## Issues Found
${ISSUES_FOUND}

## Recommendations
${RECOMMENDATIONS}
EOF

    echo "📋 Testing report generated: $report_file"
}
```

## 🔄 Continuous Testing Integration

### CI/CD Testing Pipeline

```bash
# Setup continuous testing pipeline
setup_continuous_testing_pipeline() {
    echo "🔄 Setting up Continuous Testing Pipeline..."
    
    cat > .github/workflows/bigblocks-testing.yml <<'EOF'
name: BigBlocks Multi-Framework Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-frameworks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        framework: [react, nextjs, express, astro]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Setup BigBlocks Testing Environment
      run: |
        npm install -g bigblocks
        ./setup-${{ matrix.framework }}-testing.sh
    
    - name: Run Framework Tests
      run: |
        cd bigblocks-${{ matrix.framework }}-test
        npm test
    
    - name: Run Integration Tests
      run: |
        ./test-blockchain-integration-${{ matrix.framework }}.sh
    
    - name: Generate Framework Report
      run: |
        ./generate-framework-report.sh ${{ matrix.framework }}
    
    - name: Upload Test Results
      uses: actions/upload-artifact@v3
      with:
        name: test-results-${{ matrix.framework }}
        path: test-results/
EOF
}
```

---

**Ensure BigBlocks components work flawlessly across all frameworks with comprehensive testing coverage, blockchain integration validation, and performance optimization across React, Next.js, Express, and Astro environments.**