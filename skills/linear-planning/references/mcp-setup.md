# Linear MCP Server Setup

## Install via Claude Code

The easiest way — run this in Claude Code and authenticate:

```bash
/mcp
```

Then search for "Linear" and follow the OAuth flow. Claude Code will store the credentials and the MCP server will be available in all sessions.

## Manual Install

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["@linear/mcp-server@latest"],
      "env": {
        "LINEAR_API_KEY": "your-linear-api-key"
      }
    }
  }
}
```

Get your API key from: Linear → Settings → API → Personal API Keys

## Verify It's Working

After setup, check Claude Code has Linear tools:

```
linear_get_teams()
```

Should return your Linear workspace teams with their IDs.

## Finding Your IDs

You'll need these IDs frequently — fetch them once and note them down:

```
# Get team ID
linear_get_teams()
→ Note: team.id (e.g., "a1b2c3d4-...")

# Get project ID
linear_get_projects(teamId: "your-team-id")
→ Note: project.id for the project you're working in

# Get state IDs (for status transitions)
linear_get_issue_statuses(teamId: "your-team-id")
→ Note: state.id for Todo, In Progress, In Review, Done
```

## Troubleshooting

**MCP tools not appearing**: Restart Claude Code after adding to settings.json.

**Auth error**: Run `/mcp` again and re-authenticate.

**Rate limits**: Linear has API rate limits. For bulk ticket creation (20+), add a brief pause between calls or batch them.

**Missing tools**: Tool names vary slightly by MCP server version. Run `linear_` and tab-complete to see available tools, or check the `@linear/mcp-server` changelog.
