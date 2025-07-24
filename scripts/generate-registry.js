#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Category definitions
const CATEGORIES = {
  development: {
    name: "Development Workflows",
    description: "Code management, dependency updates, and development automation",
    icon: "🚀"
  },
  design: {
    name: "Design & UI Development",
    description: "Component libraries, frameworks, design tools",
    icon: "🎨"
  },
  blockchain: {
    name: "Blockchain Operations",
    description: "BSV network monitoring, wallet operations, and blockchain automation",
    icon: "⛓️"
  },
  analytics: {
    name: "Analytics & Reporting",
    description: "Productivity analytics, metrics, and reporting automation",
    icon: "📊"
  },
  infrastructure: {
    name: "Infrastructure & DevOps",
    description: "Deployment, CI/CD, and infrastructure management",
    icon: "🔧"
  },
  "cross-project": {
    name: "Cross-Project Operations",
    description: "Multi-repository coordination and synchronization",
    icon: "🔄"
  }
};

// Parse frontmatter from markdown file
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  try {
    return yaml.load(match[1]) || {};
  } catch (e) {
    console.warn('Failed to parse frontmatter:', e.message);
    return {};
  }
}

// Extract title from markdown
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

// Get all prompt files
function getPromptFiles() {
  const prompts = [];
  
  Object.keys(CATEGORIES).forEach(category => {
    const categoryPath = path.join(__dirname, '..', category);
    if (!fs.existsSync(categoryPath)) return;
    
    const files = fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.md') && file !== 'README.md');
    
    files.forEach(file => {
      const filePath = path.join(categoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);
      const stats = fs.statSync(filePath);
      
      // Skip if frontmatter indicates it's not a prompt
      if (frontmatter.type === 'documentation' || frontmatter.skip_registry) return;
      
      const id = `${category}/${file.replace('.md', '')}`;
      const name = frontmatter.name || extractTitle(content);
      
      prompts.push({
        id,
        name,
        version: frontmatter.version || "1.0.0",
        description: frontmatter.description || "No description provided",
        category,
        tags: frontmatter.tags || [],
        complexity: frontmatter.complexity || "moderate",
        path: `${category}/${file}`,
        metadata: {
          llm_provider: frontmatter.llm_provider || ["claude"],
          estimated_tokens: frontmatter.estimated_tokens,
          time_estimate: frontmatter.time_estimate,
          last_modified: stats.mtime.toISOString().split('T')[0]
        }
      });
    });
  });
  
  return prompts;
}

// Generate the registry
function generateRegistry() {
  const prompts = getPromptFiles();
  const categoriesWithContent = [...new Set(prompts.map(p => p.category))];
  
  const registry = {
    "$schema": "./prompt-schema.json",
    "version": "1.0.0",
    "name": "BSV Ecosystem Prompts Registry",
    "description": "Central registry of all prompts in the BSV development ecosystem",
    "categories": {},
    "prompts": prompts.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    }),
    "statistics": {
      "total_prompts": prompts.length,
      "categories_count": categoriesWithContent.length,
      "last_updated": new Date().toISOString().split('T')[0],
      "generated": true,
      "contributors": 1
    }
  };
  
  // Only include categories that have content
  categoriesWithContent.forEach(cat => {
    if (CATEGORIES[cat]) {
      registry.categories[cat] = CATEGORIES[cat];
    }
  });
  
  return registry;
}

// Main execution
if (require.main === module) {
  try {
    const registry = generateRegistry();
    const outputPath = path.join(__dirname, '..', 'registry.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2) + '\n');
    
    console.log(`✅ Registry generated successfully!`);
    console.log(`📊 Total prompts: ${registry.statistics.total_prompts}`);
    console.log(`📁 Active categories: ${registry.statistics.categories_count}`);
    console.log(`📅 Last updated: ${registry.statistics.last_updated}`);
  } catch (error) {
    console.error('❌ Failed to generate registry:', error);
    process.exit(1);
  }
}

module.exports = { generateRegistry };