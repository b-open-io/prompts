---
version: 1.0.0
allowed-tools: Bash(which:*), Bash(npm:*), Bash(npx:*), Bash(bun:*), Bash(bunx:*), Bash(uv:*), Bash(uvx:*), Bash(pip:*), Bash(pip3:*), Bash(python:*), Bash(python3:*), Bash(pg_isready:*), Bash(redis-cli:*), Bash(mongosh:*), Bash(mongo:*), Bash(nc:*), Bash(curl:*), Bash(claude:*), Bash(echo:*), Bash(sleep:*)
description: Interactive MCP server installer with package manager detection and database connectivity testing
argument-hint: [server-type] [--auto]
---

# MCP Server Installation Helper

Interactive installer for Model Context Protocol servers with automatic detection of package managers and databases.

## Step 1: Package Manager Detection

Detecting available package managers...

!`echo "🔍 Scanning for package managers..." && sleep 1`

### NPM/NPX Status
!`if command -v npm >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then echo "✅ npm/npx found ($(npm --version))"; else echo "❌ npm/npx not found"; fi`

### Bun/Bunx Status  
!`if command -v bun >/dev/null 2>&1 && command -v bunx >/dev/null 2>&1; then echo "✅ bun/bunx found ($(bun --version)) - RECOMMENDED"; else echo "❌ bun/bunx not found"; fi`

### Python UV Status
!`if command -v uv >/dev/null 2>&1 && command -v uvx >/dev/null 2>&1; then echo "✅ uv/uvx found ($(uv --version))"; else echo "❌ uv/uvx not found"; fi`

### Python Pip Status
!`if command -v pip3 >/dev/null 2>&1; then if pip3 --version >/dev/null 2>&1; then echo "✅ pip3 found ($(pip3 --version | head -1))"; else echo "⚠️  pip3 found but non-functional"; fi; else if command -v pip >/dev/null 2>&1; then if pip --version >/dev/null 2>&1; then echo "✅ pip found ($(pip --version | head -1))"; else echo "⚠️  pip found but non-functional"; fi; else echo "❌ pip/pip3 not found"; fi; fi`

## Step 2: Database Detection

Checking for running databases...

!`echo "🗄️  Scanning for databases..." && sleep 1`

### PostgreSQL Status
!`if command -v pg_isready >/dev/null 2>&1; then if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then echo "✅ PostgreSQL running (localhost:5432)"; else echo "⚠️  PostgreSQL installed but not running"; fi; else if nc -z localhost 5432 2>/dev/null; then echo "⚠️  Something running on PostgreSQL port 5432"; else echo "❌ PostgreSQL not detected"; fi; fi`

### Redis Status
!`if command -v redis-cli >/dev/null 2>&1; then if redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q PONG; then echo "✅ Redis running (localhost:6379)"; else echo "⚠️  Redis CLI found but server not responding"; fi; else if nc -z localhost 6379 2>/dev/null; then echo "⚠️  Something running on Redis port 6379"; else echo "❌ Redis not detected"; fi; fi`

### MongoDB Status
!`if command -v mongosh >/dev/null 2>&1; then if mongosh --quiet --eval "db.runCommand('ping')" 2>/dev/null | grep -q ok; then echo "✅ MongoDB running (localhost:27017)"; else echo "⚠️  MongoDB shell found but server not responding"; fi; else if command -v mongo >/dev/null 2>&1; then if echo 'db.runCommand("ping")' | mongo --quiet 2>/dev/null | grep -q ok; then echo "✅ MongoDB running (localhost:27017)"; else echo "⚠️  MongoDB CLI found but server not responding"; fi; else if nc -z localhost 27017 2>/dev/null; then echo "⚠️  Something running on MongoDB port 27017"; else echo "❌ MongoDB not detected"; fi; fi; fi`

---

## Interactive Installation Menu

Based on your system, here are the available MCP servers you can install:

### 📦 Package Manager Selection
Choose your preferred package manager:
1. **Auto-detect (recommended)** - Uses the best available option
2. **bun/bunx** - Fastest JavaScript package runner
3. **npm/npx** - Standard Node.js package manager  
4. **uv/uvx** - Modern Python package installer
5. **pip/pip3** - Traditional Python package installer
6. **Custom command** - Enter your own installation command

### 🗄️ MCP Server Categories

#### 1. Database Servers
Connect to your local databases:
- **PostgreSQL MCP** - Query and manage PostgreSQL databases
- **Redis MCP** - Access Redis key-value store
- **MongoDB MCP** - Work with MongoDB collections

#### 2. Development Tools
- **GitHub MCP** - Repository management and issue tracking
- **Vercel MCP** - Deployment and project management
- **Git MCP** - Advanced git operations

#### 3. System Integration
- **Filesystem MCP** - File system operations
- **HTTP Request MCP** - API testing and integration
- **Environment MCP** - Environment variable management

#### 4. Popular Third-Party Servers
- **Obsidian MCP** - Note management integration  
- **Slack MCP** - Team communication
- **Notion MCP** - Workspace integration

---

## Installation Instructions

**Please specify which MCP servers you'd like to install by responding with:**

1. **Category number** (e.g., "1" for Database Servers)
2. **Specific server** (e.g., "PostgreSQL" or "GitHub")
3. **Package manager preference** (or "auto" for automatic detection)

### Example Usage:
- `I want to install PostgreSQL MCP using bun`
- `Install all database servers with auto-detect`
- `Set up GitHub MCP with npm`
- `Install custom server: my-custom-mcp-server`

### Database Connection Examples:

**PostgreSQL:**
```
Connection: postgresql://username:password@localhost:5432/database
Read-only: postgresql://readonly:pass@localhost:5432/mydb
Local dev: postgresql://localhost:5432/postgres
```

**Redis:**  
```
Connection: redis://localhost:6379/0
With auth: redis://:password@localhost:6379/0
Custom DB: redis://localhost:6379/5
```

**MongoDB:**
```
Connection: mongodb://localhost:27017/mydatabase
With auth: mongodb://user:pass@localhost:27017/mydb
```

---

## Installation Process

Once you specify your preferences, I will:

1. 🧪 **Test the package manager** - Verify it works with a test command
2. 🔗 **Test database connectivity** - Ensure connections work before installation  
3. 📋 **Show installation preview** - Display exact commands to be run
4. ⚠️  **Request confirmation** - Get your approval before proceeding
5. 🚀 **Execute installation** - Run the claude config commands
6. ✅ **Verify installation** - Test the MCP server is working
7. 🔄 **Restart reminder** - Prompt you to restart Claude Code

### Security Notes:
- Database connections are installed at user level (`-s user`) by default
- Read-only access is recommended for production databases
- Connection strings with credentials are stored in Claude Code config
- You can always remove servers later with `claude config remove`

**Ready to proceed? Tell me which MCP servers you'd like to install!**