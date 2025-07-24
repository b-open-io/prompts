#!/bin/bash

# Generate registry.json from prompt files - REAL VERSION

echo "🔍 Scanning for prompts..."

# Function to extract value from YAML frontmatter
extract_yaml_value() {
    local file=$1
    local key=$2
    # Extract content between --- markers
    sed -n '/^---$/,/^---$/p' "$file" | grep "^$key:" | sed "s/^$key: *//" | sed 's/^"\(.*\)"$/\1/' | head -1
}

# Function to extract tags array from YAML
extract_yaml_array() {
    local file=$1
    local key=$2
    # Extract array values, handling both inline and multiline formats
    awk '/^'$key':/ {
        if (match($0, /\[.*\]/)) {
            # Inline array format
            gsub(/^'$key': *\[/, ""); 
            gsub(/\].*$/, "");
            gsub(/"/, "");
            print
        } else {
            # Multiline array format
            getline
            while ($0 ~ /^  *-/) {
                gsub(/^  *- */, "");
                gsub(/"/, "");
                printf "%s,", $0
                getline
            }
        }
    }' "$file" | sed 's/,$//'
}

# Function to extract first heading from markdown
extract_first_heading() {
    local file=$1
    grep -m1 "^# " "$file" | sed 's/^# *//'
}

# Function to escape JSON strings
escape_json() {
    echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/	/\\t/g' | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//'
}

# Start building the JSON
cat > registry.json << 'EOF'
{
  "$schema": "./prompt-schema.json",
  "version": "1.0.0",
  "name": "OPL Prompts Registry",
  "description": "Central registry of all prompts in the BSV development ecosystem",
  "categories": {
EOF

# Track which categories have content
active_categories=""

# Add categories that have .md files
first_cat=true
for category in development design blockchain analytics infrastructure cross-project; do
    if [ -d "$category" ] && find "$category" -name "*.md" ! -name "README.md" | grep -q .; then
        active_categories="$active_categories $category"
        
        if [ "$first_cat" = false ]; then
            echo "," >> registry.json
        fi
        first_cat=false
        
        case $category in
            development)
                cat >> registry.json << 'EOF'
    "development": {
      "name": "Development Workflows",
      "description": "Code management, dependency updates, and development automation",
      "icon": "🚀"
    }
EOF
                ;;
            design)
                cat >> registry.json << 'EOF'
    "design": {
      "name": "Design & UI Development",
      "description": "Component libraries, frameworks, design tools",
      "icon": "🎨"
    }
EOF
                ;;
            blockchain)
                cat >> registry.json << 'EOF'
    "blockchain": {
      "name": "Blockchain Operations",
      "description": "BSV network monitoring, wallet operations, and blockchain automation",
      "icon": "⛓️"
    }
EOF
                ;;
            analytics)
                cat >> registry.json << 'EOF'
    "analytics": {
      "name": "Analytics & Reporting",
      "description": "Productivity analytics, metrics, and reporting automation",
      "icon": "📊"
    }
EOF
                ;;
            infrastructure)
                cat >> registry.json << 'EOF'
    "infrastructure": {
      "name": "Infrastructure & DevOps",
      "description": "Deployment, CI/CD, and infrastructure management",
      "icon": "🔧"
    }
EOF
                ;;
            cross-project)
                cat >> registry.json << 'EOF'
    "cross-project": {
      "name": "Cross-Project Operations",
      "description": "Multi-repository coordination and synchronization",
      "icon": "🔄"
    }
EOF
                ;;
        esac
    fi
done

cat >> registry.json << 'EOF'

  },
  "prompts": [
EOF

# Now process all prompt files
prompt_count=0
first_prompt=true

for category in $active_categories; do
    for file in $(find "$category" -name "*.md" ! -name "README.md" | sort); do
        if [ "$first_prompt" = false ]; then
            echo "," >> registry.json
        fi
        first_prompt=false
        prompt_count=$((prompt_count + 1))
        
        # Extract metadata
        filename=$(basename "$file" .md)
        id="$category/$filename"
        
        # Try to get values from frontmatter
        name=$(extract_yaml_value "$file" "name")
        if [ -z "$name" ]; then
            # Fall back to first heading
            name=$(extract_first_heading "$file")
            if [ -z "$name" ]; then
                name="$filename"
            fi
        fi
        
        version=$(extract_yaml_value "$file" "version")
        [ -z "$version" ] && version="1.0.0"
        
        description=$(extract_yaml_value "$file" "description")
        [ -z "$description" ] && description="No description provided"
        
        complexity=$(extract_yaml_value "$file" "complexity")
        [ -z "$complexity" ] && complexity="moderate"
        
        # Get tags
        tags=$(extract_yaml_array "$file" "tags")
        
        # Build tags array
        tags_json="[]"
        if [ -n "$tags" ]; then
            tags_json="["
            first_tag=true
            IFS=',' read -ra TAG_ARRAY <<< "$tags"
            for tag in "${TAG_ARRAY[@]}"; do
                tag=$(echo "$tag" | sed 's/^ *//;s/ *$//')
                if [ -n "$tag" ]; then
                    if [ "$first_tag" = false ]; then
                        tags_json="$tags_json, "
                    fi
                    first_tag=false
                    tags_json="$tags_json\"$tag\""
                fi
            done
            tags_json="$tags_json]"
        fi
        
        # Get file modification date
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            last_modified=$(stat -f "%Sm" -t "%Y-%m-%d" "$file")
        else
            # Linux
            last_modified=$(stat -c "%y" "$file" | cut -d' ' -f1)
        fi
        
        # Write the prompt entry
        cat >> registry.json << EOF
    {
      "id": "$(escape_json "$id")",
      "name": "$(escape_json "$name")",
      "version": "$version",
      "description": "$(escape_json "$description")",
      "category": "$category",
      "tags": $tags_json,
      "complexity": "$complexity",
      "path": "$file",
      "metadata": {
        "llm_provider": ["claude"],
        "last_modified": "$last_modified"
      }
    }
EOF
    done
done

# Count active categories
category_count=$(echo "$active_categories" | wc -w | tr -d ' ')

# Close the JSON structure
cat >> registry.json << EOF

  ],
  "statistics": {
    "total_prompts": $prompt_count,
    "categories_count": $category_count,
    "last_updated": "$(date +%Y-%m-%d)",
    "generated": true
  }
}
EOF

echo "✅ Registry generated!"
echo "📊 Total prompts: $prompt_count"
echo "📁 Active categories: $category_count"
echo "📅 Generated: $(date +%Y-%m-%d)"

# List what was included
echo ""
echo "📝 Included prompts:"
for category in $active_categories; do
    count=$(find "$category" -name "*.md" ! -name "README.md" | wc -l | tr -d ' ')
    echo "  - $category: $count prompts"
done