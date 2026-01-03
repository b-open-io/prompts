---
name: install-github-mcp
version: 1.0.0
description: Install and configure the GitHub MCP server for repository management
permissions:
  - read_file: ~/.claude/claude_desktop_config.json
  - write_file: ~/.claude/claude_desktop_config.json
  - execute_command: git
tags: [mcp, github, installation, configuration]
---

# Install GitHub MCP Server

Installs and configures the GitHub MCP server for Claude Desktop, enabling powerful GitHub repository management, issue tracking, and CI/CD operations.

## Prerequisites

1. **Claude Desktop** installed and running
2. **GitHub Personal Access Token** with appropriate permissions
3. **Complete restart** of Claude Desktop after configuration

## Quick Installation

### Method 1: Remote Server (Recommended)

Add this to your `claude_desktop_config.json`:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "github_token",
      "description": "GitHub Personal Access Token",
      "password": true
    }
  ],
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${input:github_token}"
      }
    }
  }
}
```

### Method 2: Docker Installation (Local Control)

For environments requiring local control:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "github_token",
      "description": "GitHub Personal Access Token",
      "password": true
    }
  ],
  "servers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"
      }
    }
  }
}
```

## Creating GitHub Personal Access Token

### Fine-grained Token (Recommended)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Select repositories (specific or all)
4. Grant permissions:
   - **Repository**: Contents (Read/Write), Issues (Read/Write), Pull requests (Read/Write), Actions (Read)
   - **Account**: Git SSH keys (Read), GPG keys (Read)
5. Set expiration and generate

### Classic Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (full repository access)
   - ✅ `read:packages` (package registry)
   - ✅ `workflow` (GitHub Actions)
   - ✅ `read:org` (organization info)
4. Generate token

## Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Available Tools

Once installed, you can:

- **Repository Management**: Browse, search, create, and update files
- **Issue Operations**: Create, update, label, and manage issues
- **Pull Requests**: Create PRs, manage reviews, update branches
- **GitHub Actions**: Monitor workflows, analyze failures
- **Code Search**: Search across repositories with GitHub syntax
- **Security**: Review Dependabot alerts and security findings

## Full Development Environment

Combine GitHub MCP with other servers:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "github_token",
      "description": "GitHub Personal Access Token",
      "password": true
    }
  ],
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${input:github_token}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "~/Projects"
      ]
    },
    "git-operations": {
      "command": "npx",
      "args": ["-y", "@cyanheads/git-mcp-server"]
    }
  }
}
```

## Multiple GitHub Accounts

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "personal_token",
      "description": "Personal GitHub Token",
      "password": true
    },
    {
      "type": "promptString",
      "id": "work_token",
      "description": "Work GitHub Token",
      "password": true
    }
  ],
  "servers": {
    "github-personal": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${input:personal_token}"
      }
    },
    "github-work": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${input:work_token}"
      }
    }
  }
}
```

## Troubleshooting

### Server Not Appearing
1. **Completely quit** Claude Desktop (not just close)
2. Restart Claude Desktop
3. Look for MCP indicator in bottom-right corner
4. Check JSON syntax is valid

### Authentication Issues
- Verify token hasn't expired
- Check token has required permissions
- Test token with: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

### Common Errors

**"Server disconnected"**
- Check token permissions
- Verify network connectivity
- Review server logs

**"Transport closed unexpectedly"**
- Often indicates timeout
- Check rate limits
- Verify configuration

## Security Best Practices

1. **Never hardcode tokens** - Always use input prompts
2. **Use fine-grained tokens** when possible
3. **Set expiration dates** on tokens
4. **Grant minimum permissions** required
5. **Rotate tokens regularly**
6. **Monitor token usage** in GitHub settings

## Example Use Cases

After installation, you can:

- "Show me all open PRs in my repositories"
- "Create an issue for the bug we just discussed"
- "Search for authentication functions across all repos"
- "Review the latest GitHub Actions failures"
- "Update the README with new documentation"
- "Create a feature branch for the new component"

## Verification

To verify installation:
1. Restart Claude Desktop completely
2. Check for GitHub MCP in the server list (bottom-right corner)
3. Try: "List my GitHub repositories"
4. Claude will prompt for your token on first use

## Need Help?

- Check the [official GitHub MCP documentation](https://github.com/github/github-mcp-server)
- Review [MCP troubleshooting guide](https://modelcontextprotocol.io/docs/troubleshooting)
- Ensure Docker Desktop is running (if using Docker method)

---

**Important**: After adding the configuration, you must **completely restart Claude Desktop** for changes to take effect.