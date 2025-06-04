---
name: "BigBlocks Theme Management and Design System Synchronization"
version: "1.0.0"
description: "Advanced theme management and design system synchronization across BigBlocks ecosystem"
category: "bigblocks"
tags: ["themes", "design-system", "synchronization", "consistency", "components", "styling"]
author: "BSV Development Team"
requirements:
  tools: ["Claude Code", "npx bigblocks", "css-tree", "postcss"]
  environment: ["THEME_CONFIG", "DESIGN_TOKENS"]
  dependencies: ["bigblocks/component-ecosystem-manager"]
metadata:
  llm_provider: ["claude"]
  complexity: "advanced"
  estimated_tokens: 14000
  time_estimate: "45-75 minutes"
  bigblocks_version: "0.0.12"
---

# BigBlocks Theme Management and Design System Synchronization

**Advanced Theme Management and Design System Consistency Across BigBlocks Ecosystem**

## 🎯 Mission

Ensure perfect theme consistency and design system synchronization across all BigBlocks v0.0.12 components and frameworks. Maintain unified visual identity, adaptive theming, and seamless design token management across React, Next.js, Express, and Astro implementations.

## 🎨 Theme Management Capabilities

### 1. **Unified Design Token System**
- **Color Tokens**: Consistent color palette across all components and frameworks
- **Typography Tokens**: Unified font system with scale and hierarchy
- **Spacing Tokens**: Consistent spacing and layout across components
- **Shadow & Border Tokens**: Unified visual depth and component boundaries

### 2. **Adaptive Theme System**
- **Light/Dark Mode**: Seamless theme switching with component consistency
- **Custom Themes**: Support for brand-specific theme customization
- **Framework Adaptation**: Themes work perfectly across all supported frameworks
- **Real-time Synchronization**: Live theme updates across component ecosystem

### 3. **Design System Validation**
- **Component Consistency**: Ensure all components follow design system rules
- **Token Usage Validation**: Verify proper design token implementation
- **Visual Regression Testing**: Detect theme-related visual changes
- **Cross-Framework Consistency**: Maintain identical appearance across frameworks

## 🧠 Theme Synchronization StateFlow

```yaml
theme_sync_flow:
  initial_state: "audit_current_theme_system"
  
  states:
    audit_current_theme_system:
      description: "Comprehensive audit of current theme implementation"
      actions:
        - "analyze_existing_theme_tokens_and_variables"
        - "identify_theme_inconsistencies_across_components"
        - "map_framework_specific_theme_implementations"
        - "assess_design_token_usage_patterns"
        - "evaluate_theme_switching_functionality"
      success_transitions:
        - audit_complete: "standardize_design_tokens"
      error_transitions:
        - audit_failed: "manual_theme_inventory"

    standardize_design_tokens:
      description: "Create unified design token system"
      actions:
        - "define_core_design_token_architecture"
        - "create_semantic_token_naming_conventions"
        - "establish_token_hierarchy_and_relationships"
        - "implement_framework_agnostic_token_format"
        - "create_token_validation_schemas"
      success_transitions:
        - tokens_standardized: "implement_adaptive_theming"
      error_transitions:
        - standardization_failed: "fallback_to_existing_tokens"

    implement_adaptive_theming:
      description: "Implement adaptive theme system across all components"
      parallel_actions:
        theme_infrastructure:
          - "implement_theme_provider_system"
          - "create_theme_switching_mechanisms"
          - "establish_theme_persistence_system"
          - "implement_system_preference_detection"
        
        component_theming:
          - "update_all_components_for_adaptive_theming"
          - "implement_theme_aware_component_variants"
          - "create_theme_transition_animations"
          - "ensure_accessibility_across_themes"
        
        framework_integration:
          - "implement_react_theme_integration"
          - "create_nextjs_theme_system_integration"
          - "implement_express_theme_server_rendering"
          - "integrate_astro_theme_system"
      
      success_transitions:
        - adaptive_theming_implemented: "validate_cross_framework_consistency"
      error_transitions:
        - theming_implementation_failed: "debug_theme_integration_issues"

    validate_cross_framework_consistency:
      description: "Ensure theme consistency across all frameworks"
      actions:
        - "run_visual_regression_tests_across_frameworks"
        - "validate_design_token_usage_consistency"
        - "test_theme_switching_across_all_components"
        - "verify_accessibility_compliance_across_themes"
        - "ensure_performance_optimization_with_theming"
      success_transitions:
        - consistency_validated: "setup_continuous_monitoring"
      error_transitions:
        - consistency_issues_found: "fix_theme_consistency_problems"

    setup_continuous_monitoring:
      description: "Setup continuous theme monitoring and validation"
      actions:
        - "implement_automated_theme_regression_testing"
        - "setup_design_token_change_detection"
        - "create_theme_performance_monitoring"
        - "establish_design_system_compliance_reporting"
      success_transitions:
        - monitoring_configured: "complete"

error_recovery:
  fix_theme_consistency_problems:
    description: "Resolve theme consistency issues"
    actions:
      - "identify_specific_inconsistency_patterns"
      - "fix_component_theme_implementation_issues"
      - "resolve_framework_specific_theme_problems"
      - "update_design_token_usage_patterns"
```

## 🎨 Design Token Implementation

### Unified Design Token System

```typescript
// Comprehensive BigBlocks design token system
export const BigBlocksDesignTokens = {
  // Color System
  colors: {
    // Primary colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#0ea5e9',
      900: '#0c4a6e',
    },
    
    // Semantic colors
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    
    // Bitcoin/BSV brand colors
    bitcoin: {
      orange: '#f7931a',
      gold: '#ffd700',
      secondary: '#4a4a4a',
    },
    
    // Social component colors
    social: {
      like: '#ef4444',
      share: '#3b82f6',
      comment: '#6b7280',
      friend: '#10b981',
    }
  },
  
  // Typography System
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Monaco', 'monospace'],
    },
    
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    }
  },
  
  // Spacing System
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
  },
  
  // Component-specific tokens
  components: {
    button: {
      borderRadius: '0.375rem',
      paddingX: '1rem',
      paddingY: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
    },
    
    card: {
      borderRadius: '0.5rem',
      padding: '1.5rem',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    },
    
    input: {
      borderRadius: '0.375rem',
      padding: '0.625rem 0.875rem',
      fontSize: '0.875rem',
      borderWidth: '1px',
    }
  },
  
  // Animation tokens
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    }
  }
};

// Theme variants
export const LightTheme = {
  ...BigBlocksDesignTokens,
  colors: {
    ...BigBlocksDesignTokens.colors,
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
    },
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
    }
  }
};

export const DarkTheme = {
  ...BigBlocksDesignTokens,
  colors: {
    ...BigBlocksDesignTokens.colors,
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#64748b',
    },
    border: {
      primary: '#334155',
      secondary: '#475569',
    }
  }
};
```

### Framework-Agnostic Theme Provider

```typescript
// Universal theme provider for all frameworks
export class BigBlocksThemeManager {
  private currentTheme: 'light' | 'dark' | 'auto' = 'auto';
  private customThemes: Map<string, any> = new Map();
  private listeners: Set<(theme: any) => void> = new Set();
  
  constructor() {
    this.initializeTheme();
    this.setupSystemThemeListener();
  }
  
  // Initialize theme system
  private initializeTheme() {
    // Load saved theme preference
    const savedTheme = this.loadThemePreference();
    this.setTheme(savedTheme);
  }
  
  // Set theme with validation and synchronization
  setTheme(theme: 'light' | 'dark' | 'auto' | string) {
    this.currentTheme = theme as any;
    
    const resolvedTheme = this.resolveTheme(theme);
    
    // Apply theme to document
    this.applyThemeToDocument(resolvedTheme);
    
    // Save preference
    this.saveThemePreference(theme);
    
    // Notify listeners
    this.notifyThemeChange(resolvedTheme);
  }
  
  private resolveTheme(theme: string) {
    switch (theme) {
      case 'light':
        return LightTheme;
      case 'dark':
        return DarkTheme;
      case 'auto':
        return this.getSystemTheme();
      default:
        return this.customThemes.get(theme) || LightTheme;
    }
  }
  
  private getSystemTheme() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? DarkTheme 
        : LightTheme;
    }
    return LightTheme;
  }
  
  // Apply theme to document with CSS custom properties
  private applyThemeToDocument(theme: any) {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply color tokens
    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--bb-bg-${key}`, value as string);
    });
    
    Object.entries(theme.colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--bb-text-${key}`, value as string);
    });
    
    Object.entries(theme.colors.border).forEach(([key, value]) => {
      root.style.setProperty(`--bb-border-${key}`, value as string);
    });
    
    // Apply component tokens
    Object.entries(theme.components).forEach(([component, tokens]) => {
      Object.entries(tokens as any).forEach(([property, value]) => {
        root.style.setProperty(`--bb-${component}-${property}`, value as string);
      });
    });
    
    // Set theme class
    root.setAttribute('data-bb-theme', this.currentTheme);
  }
  
  // Register custom theme
  registerCustomTheme(name: string, theme: any) {
    // Validate theme structure
    const validatedTheme = this.validateThemeStructure(theme);
    this.customThemes.set(name, validatedTheme);
  }
  
  private validateThemeStructure(theme: any): any {
    // Ensure theme has required structure
    const requiredKeys = ['colors', 'typography', 'spacing', 'components'];
    
    for (const key of requiredKeys) {
      if (!theme[key]) {
        throw new Error(`Theme missing required key: ${key}`);
      }
    }
    
    return theme;
  }
  
  // Theme change listener
  onThemeChange(callback: (theme: any) => void) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  private notifyThemeChange(theme: any) {
    this.listeners.forEach(callback => callback(theme));
  }
  
  private setupSystemThemeListener() {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.currentTheme === 'auto') {
        this.setTheme('auto');
      }
    });
  }
  
  private loadThemePreference(): string {
    if (typeof localStorage === 'undefined') return 'auto';
    return localStorage.getItem('bb-theme') || 'auto';
  }
  
  private saveThemePreference(theme: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('bb-theme', theme);
  }
  
  // Get current theme
  getCurrentTheme() {
    return this.resolveTheme(this.currentTheme);
  }
  
  // Get available themes
  getAvailableThemes() {
    return ['light', 'dark', 'auto', ...this.customThemes.keys()];
  }
}

// Global theme manager instance
export const themeManager = new BigBlocksThemeManager();
```

### Component Theme Integration

```typescript
// Theme-aware component implementation
import React from 'react';
import { themeManager } from './theme-manager';

export const useTheme = () => {
  const [theme, setTheme] = React.useState(themeManager.getCurrentTheme());
  
  React.useEffect(() => {
    const unsubscribe = themeManager.onThemeChange(setTheme);
    return unsubscribe;
  }, []);
  
  return {
    theme,
    setTheme: (themeName: string) => themeManager.setTheme(themeName),
    availableThemes: themeManager.getAvailableThemes(),
    currentThemeName: themeManager.currentTheme
  };
};

// Theme-aware BigBlocks component example
export const ThemedPostCard: React.FC<{ post: any }> = ({ post }) => {
  const { theme } = useTheme();
  
  const styles = {
    card: {
      backgroundColor: theme.colors.background.primary,
      color: theme.colors.text.primary,
      borderRadius: theme.components.card.borderRadius,
      padding: theme.components.card.padding,
      boxShadow: theme.components.card.shadow,
      border: `1px solid ${theme.colors.border.primary}`,
      transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.ease}`,
    },
    
    button: {
      backgroundColor: theme.colors.primary[500],
      color: '#ffffff',
      borderRadius: theme.components.button.borderRadius,
      padding: `${theme.components.button.paddingY} ${theme.components.button.paddingX}`,
      fontSize: theme.components.button.fontSize,
      fontWeight: theme.components.button.fontWeight,
      border: 'none',
      cursor: 'pointer',
      transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.ease}`,
    }
  };
  
  return (
    <div style={styles.card}>
      <h3 style={{ margin: 0, marginBottom: theme.spacing[3] }}>
        {post.title}
      </h3>
      <p style={{ 
        margin: 0, 
        marginBottom: theme.spacing[4],
        color: theme.colors.text.secondary 
      }}>
        {post.content}
      </p>
      <button style={styles.button}>
        Like ({post.likes})
      </button>
    </div>
  );
};
```

## 🔧 Theme Validation & Testing

```bash
# Comprehensive theme validation and testing
validate_bigblocks_themes() {
    echo "🎨 Validating BigBlocks Theme System..."
    
    # Test theme consistency across frameworks
    test_theme_consistency_across_frameworks
    
    # Validate design token usage
    validate_design_token_usage
    
    # Test theme switching functionality
    test_theme_switching_functionality
    
    # Run visual regression tests
    run_theme_visual_regression_tests
}

test_theme_consistency_across_frameworks() {
    echo "  🔍 Testing theme consistency across frameworks..."
    
    local frameworks=("react" "nextjs" "express" "astro")
    
    for framework in "${frameworks[@]}"; do
        echo "    Testing $framework theme consistency..."
        
        # Build framework with themes
        build_framework_with_themes "$framework"
        
        # Capture theme screenshots
        capture_theme_screenshots "$framework"
        
        # Compare with baseline
        compare_with_baseline "$framework"
    done
}

validate_design_token_usage() {
    echo "  📊 Validating design token usage..."
    
    # Scan all components for token usage
    find . -name "*.tsx" -o -name "*.ts" -o -name "*.css" | while read -r file; do
        # Check for hardcoded values that should use tokens
        if grep -E "(#[0-9a-fA-F]{3,6}|rgb\(|rgba\()" "$file" > /dev/null; then
            echo "    ⚠️ Potential hardcoded color in $file"
        fi
        
        # Check for magic numbers that should use spacing tokens
        if grep -E "margin:|padding:" "$file" | grep -E "[0-9]+px" > /dev/null; then
            echo "    ⚠️ Potential hardcoded spacing in $file"
        fi
    done
}
```

---

**Ensure perfect theme consistency and design system synchronization across all BigBlocks components and frameworks with unified design tokens and adaptive theming.**