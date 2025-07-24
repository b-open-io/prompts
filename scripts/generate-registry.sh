#!/bin/bash

# Generate registry.json from prompt files

echo "Generating registry.json..."

# Start the JSON structure
cat > registry.json << 'EOF'
{
  "$schema": "./prompt-schema.json",
  "version": "1.0.0",
  "name": "OPL Prompts Registry",
  "description": "Central registry of all prompts in the BSV development ecosystem",
  "categories": {
    "development": {
      "name": "Development Workflows",
      "description": "Code management, dependency updates, and development automation",
      "icon": "🚀"
    },
    "design": {
      "name": "Design & UI Development",
      "description": "Component libraries, frameworks, design tools",
      "icon": "🎨"
    },
    "blockchain": {
      "name": "Blockchain Operations",
      "description": "BSV network monitoring, wallet operations, and blockchain automation",
      "icon": "⛓️"
    },
    "analytics": {
      "name": "Analytics & Reporting",
      "description": "Productivity analytics, metrics, and reporting automation",
      "icon": "📊"
    },
    "infrastructure": {
      "name": "Infrastructure & DevOps",
      "description": "Deployment, CI/CD, and infrastructure management",
      "icon": "🔧"
    },
    "cross-project": {
      "name": "Cross-Project Operations",
      "description": "Multi-repository coordination and synchronization",
      "icon": "🔄"
    }
  },
  "prompts": [],
  "statistics": {
    "total_prompts": 0,
    "categories_count": 0,
    "last_updated": "DATE",
    "generated": true
  }
}
EOF

# Count prompts
total=$(find . -type f -name "*.md" \( -path "./development/*" -o -path "./design/*" -o -path "./infrastructure/*" -o -path "./blockchain/*" -o -path "./analytics/*" -o -path "./cross-project/*" \) ! -name "README.md" | wc -l | tr -d ' ')

# Count categories with content
categories=0
for dir in development design infrastructure blockchain analytics cross-project; do
  if [ -d "$dir" ] && ls "$dir"/*.md 2>/dev/null | grep -v README.md > /dev/null; then
    categories=$((categories + 1))
  fi
done

# Update date
today=$(date +%Y-%m-%d)

# Update the statistics
sed -i.bak "s/\"total_prompts\": 0/\"total_prompts\": $total/" registry.json
sed -i.bak "s/\"categories_count\": 0/\"categories_count\": $categories/" registry.json
sed -i.bak "s/\"last_updated\": \"DATE\"/\"last_updated\": \"$today\"/" registry.json

# Clean up backup
rm registry.json.bak

echo "✅ Registry generated!"
echo "📊 Total prompts: $total"
echo "📁 Categories: $categories"
echo "📅 Date: $today"

# Ensure newline at end of file
echo >> registry.json