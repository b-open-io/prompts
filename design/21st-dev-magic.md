# 21st.dev Magic MCP - AI Component Generation

## Overview
Magic Component Platform (MCP) is an AI-powered tool that generates modern UI components instantly from natural language descriptions. It integrates directly into your IDE through MCP (Model Context Protocol).

## Key Features
- **AI-Powered Generation**: Describe components in plain English
- **Multi-IDE Support**: Works with Cursor, Windsurf, VSCode
- **Real-time Preview**: See components as they're generated
- **TypeScript Ready**: Full TypeScript support out of the box
- **Component Library**: Access to pre-built, customizable components
- **Framework Agnostic**: Works with React, Vue, and other frameworks

## Installation

### 1. Get API Key
Visit [21st.dev Magic Console](https://console.21st.dev) to generate your API key

### 2. Install via CLI
```bash
# Install for your IDE (cursor, windsurf, or vscode)
npx @21st-dev/cli@latest install cursor --api-key YOUR_API_KEY
```

### 3. Configure MCP
The CLI will automatically configure your IDE's MCP settings

## Usage

### Basic Component Generation
```
/ui Create a modern pricing card with three tiers
```

### Advanced Examples
```
/ui Build a dashboard sidebar with collapsible sections, dark mode support, and icon navigation

/ui Design a multi-step form wizard with progress indicator and validation

/ui Create an animated hero section with gradient background and CTA buttons
```

## Integration with Design Workflow

### 1. Rapid Prototyping
- Generate initial component designs quickly
- Iterate on variations with natural language
- Test different approaches without manual coding

### 2. Component Enhancement
```
/ui Take this button component and add hover animations, loading state, and size variants
```

### 3. Design System Alignment
```
/ui Create a card component that matches our existing design system with primary/secondary variants
```

### 4. Accessibility Features
```
/ui Generate a modal dialog with proper ARIA labels, keyboard navigation, and focus management
```

## Best Practices

### Clear Descriptions
Be specific about:
- Visual appearance
- Interactive behavior
- State variations
- Responsive design needs

### Example Prompts
```
✅ Good: "Create a notification toast that slides in from the top-right, auto-dismisses after 5 seconds, with success/error/warning variants"

❌ Vague: "Make a notification"
```

### Component Customization
After generation:
1. Review the generated code
2. Adjust styles to match your design system
3. Add any missing business logic
4. Extract reusable parts

## Working with Existing Projects

### Integration Steps
1. Generate component with Magic
2. Review and adjust for your stack
3. Apply your theme/design tokens
4. Add to your component library

### With shadcn/ui
```
/ui Create a data table component compatible with shadcn/ui styling
```

### With Tailwind
```
/ui Build a responsive navigation bar using Tailwind CSS utilities
```

## Advanced Features

### Component Variations
```
/ui Create a button component with variants: primary, secondary, ghost, and destructive
```

### Complex Interactions
```
/ui Design a drag-and-drop kanban board with columns and cards
```

### Data Visualization
```
/ui Generate a responsive chart component with line, bar, and pie chart options
```

## Tips for Success

1. **Start Simple**: Begin with basic components and iterate
2. **Be Descriptive**: Include colors, sizes, and behaviors
3. **Review Output**: Always review and test generated code
4. **Customize**: Adapt components to your specific needs
5. **Learn Patterns**: Study generated code to improve your skills

## Current Status
- **Beta Phase**: All features are free during beta
- **Active Development**: Regular updates and improvements
- **Community Driven**: Join Discord for support and feedback

## Resources
- [GitHub Repository](https://github.com/21st-dev/magic-mcp)
- [Documentation](https://docs.21st.dev)
- [Discord Community](https://discord.gg/21st-dev)
- [API Console](https://console.21st.dev)