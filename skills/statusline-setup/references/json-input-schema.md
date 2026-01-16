# JSON Input Schema

Complete documentation of the JSON data passed to status line commands via stdin.

## Full Schema

```json
{
  "hook_event_name": "Status",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/current/working/directory",
  "model": {
    "id": "claude-opus-4-1",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "1.0.80",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  },
  "context_window": {
    "total_input_tokens": 15234,
    "total_output_tokens": 4521,
    "context_window_size": 200000,
    "current_usage": {
      "input_tokens": 8500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 2000
    }
  }
}
```

## Field Reference

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `hook_event_name` | string | Always "Status" for status line |
| `session_id` | string | Unique session identifier |
| `transcript_path` | string | Path to session transcript JSON file |
| `cwd` | string | Current working directory (legacy, use workspace.current_dir) |
| `version` | string | Claude Code version number |

### Model Object

| Field | Type | Description |
|-------|------|-------------|
| `model.id` | string | Model identifier (e.g., "claude-opus-4-1", "claude-sonnet-4-20250514") |
| `model.display_name` | string | Human-readable name (e.g., "Opus", "Sonnet") |

### Workspace Object

| Field | Type | Description |
|-------|------|-------------|
| `workspace.current_dir` | string | Current working directory |
| `workspace.project_dir` | string | Original project directory where session started |

### Output Style Object

| Field | Type | Description |
|-------|------|-------------|
| `output_style.name` | string | Current output style (e.g., "default") |

### Cost Object

| Field | Type | Description |
|-------|------|-------------|
| `cost.total_cost_usd` | number | Total session cost in USD |
| `cost.total_duration_ms` | number | Total session duration in milliseconds |
| `cost.total_api_duration_ms` | number | Time spent in API calls |
| `cost.total_lines_added` | number | Lines of code added in session |
| `cost.total_lines_removed` | number | Lines of code removed in session |

### Context Window Object

| Field | Type | Description |
|-------|------|-------------|
| `context_window.total_input_tokens` | number | Cumulative input tokens across session |
| `context_window.total_output_tokens` | number | Cumulative output tokens across session |
| `context_window.context_window_size` | number | Maximum context size (e.g., 200000) |
| `context_window.current_usage` | object\|null | Current context state (may be null) |

### Current Usage Object

Only available after first API call. May be `null` at session start.

| Field | Type | Description |
|-------|------|-------------|
| `current_usage.input_tokens` | number | Input tokens in current context |
| `current_usage.output_tokens` | number | Output tokens generated |
| `current_usage.cache_creation_input_tokens` | number | Tokens written to cache |
| `current_usage.cache_read_input_tokens` | number | Tokens read from cache |

## Extracting Values with jq

### Basic Extraction

```bash
input=$(cat)

# Model info
MODEL_ID=$(echo "$input" | jq -r '.model.id')
MODEL_NAME=$(echo "$input" | jq -r '.model.display_name')

# Directories
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir')
PROJECT_DIR=$(echo "$input" | jq -r '.workspace.project_dir')

# Cost
COST=$(echo "$input" | jq -r '.cost.total_cost_usd')
DURATION_MS=$(echo "$input" | jq -r '.cost.total_duration_ms')
LINES_ADDED=$(echo "$input" | jq -r '.cost.total_lines_added')
LINES_REMOVED=$(echo "$input" | jq -r '.cost.total_lines_removed')

# Version
VERSION=$(echo "$input" | jq -r '.version')
```

### Context Window Calculations

```bash
# Get context window size
CONTEXT_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size')

# Check if current_usage exists
USAGE=$(echo "$input" | jq '.context_window.current_usage')

if [ "$USAGE" != "null" ]; then
    # Calculate total current tokens
    CURRENT_TOKENS=$(echo "$USAGE" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')

    # Calculate percentage
    PERCENT_USED=$((CURRENT_TOKENS * 100 / CONTEXT_SIZE))

    # Individual token counts
    INPUT_TOKENS=$(echo "$USAGE" | jq '.input_tokens')
    CACHED_TOKENS=$(echo "$USAGE" | jq '.cache_read_input_tokens')
fi
```

### Helper Functions

```bash
#!/bin/bash
input=$(cat)

# Helper functions for common extractions
get_model_name() { echo "$input" | jq -r '.model.display_name'; }
get_model_id() { echo "$input" | jq -r '.model.id'; }
get_current_dir() { echo "$input" | jq -r '.workspace.current_dir'; }
get_project_dir() { echo "$input" | jq -r '.workspace.project_dir'; }
get_version() { echo "$input" | jq -r '.version'; }
get_cost() { echo "$input" | jq -r '.cost.total_cost_usd'; }
get_duration() { echo "$input" | jq -r '.cost.total_duration_ms'; }
get_lines_added() { echo "$input" | jq -r '.cost.total_lines_added'; }
get_lines_removed() { echo "$input" | jq -r '.cost.total_lines_removed'; }
get_input_tokens() { echo "$input" | jq -r '.context_window.total_input_tokens'; }
get_output_tokens() { echo "$input" | jq -r '.context_window.total_output_tokens'; }
get_context_size() { echo "$input" | jq -r '.context_window.context_window_size'; }
get_transcript() { echo "$input" | jq -r '.transcript_path'; }
get_session_id() { echo "$input" | jq -r '.session_id'; }
```

## Handling Null/Missing Values

Always provide defaults for potentially missing fields:

```bash
# With default values
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
DURATION=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')
MODEL=$(echo "$input" | jq -r '.model.display_name // "Unknown"')

# Check for null before using
USAGE=$(echo "$input" | jq '.context_window.current_usage')
if [ "$USAGE" = "null" ]; then
    echo "No usage data yet"
else
    # Process usage data
fi
```

## Python Extraction

```python
#!/usr/bin/env python3
import json
import sys

data = json.load(sys.stdin)

# Model info
model_id = data['model']['id']
model_name = data['model']['display_name']

# Directories
current_dir = data['workspace']['current_dir']
project_dir = data['workspace']['project_dir']

# Cost
cost = data['cost']['total_cost_usd']
duration = data['cost']['total_duration_ms']
lines_added = data['cost']['total_lines_added']
lines_removed = data['cost']['total_lines_removed']

# Context (handle None)
usage = data['context_window'].get('current_usage')
if usage:
    input_tokens = usage['input_tokens']
    cached_tokens = usage['cache_read_input_tokens']
```

## Node.js Extraction

```javascript
#!/usr/bin/env node

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const data = JSON.parse(input);

    // Model info
    const modelId = data.model.id;
    const modelName = data.model.display_name;

    // Directories
    const currentDir = data.workspace.current_dir;
    const projectDir = data.workspace.project_dir;

    // Cost
    const cost = data.cost.total_cost_usd;
    const duration = data.cost.total_duration_ms;

    // Context (handle null)
    const usage = data.context_window.current_usage;
    if (usage) {
        const inputTokens = usage.input_tokens;
        const cachedTokens = usage.cache_read_input_tokens;
    }
});
```

## Transcript File

The `transcript_path` points to a JSON file containing the full conversation history. Parse it to extract:

- Last edited file paths
- Recent tool calls
- Message history

```bash
TRANSCRIPT=$(echo "$input" | jq -r '.transcript_path')

if [[ -f "$TRANSCRIPT" ]]; then
    # Get last file path from recent tool calls
    LAST_FILE=$(tail -200 "$TRANSCRIPT" | \
        grep -o '"file_path":"[^"]*"' | tail -1 | \
        sed 's/"file_path":"//; s/"$//')
fi
```
