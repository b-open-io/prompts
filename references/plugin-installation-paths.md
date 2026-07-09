# Plugin & Skill Installation Paths

Where Claude Code plugins and skills live across platforms and installation methods.

## Claude Code Plugin Cache

When installed via `claude plugin install gemskills@b-open-io`:

```
~/.claude/plugins/cache/b-open-io/gemskills/<version>/
```

The full plugin tree is present, including all skills, shared modules (`utils.ts`, `shared.ts`, `resolve-root.ts`), and assets.

**Registry:** `~/.claude/plugins/installed_plugins.json` maps plugin names to install paths:
```json
{
  "plugins": {
    "gemskills@b-open-io": [
      {
        "scope": "user",
        "installPath": "/Users/.../.claude/plugins/cache/b-open-io/gemskills/0.0.42",
        "version": "0.0.42"
      }
    ]
  }
}
```

## agentskills.io / npx skills add

When installed via `npx skills add https://github.com/b-open-io/gemskills --skill generate-image`:

```
~/.agents/skills/generate-image/
  SKILL.md
  scripts/
  references/
  assets/
```

**Only the individual skill directory is copied.** Shared modules at the plugin root (`utils.ts`, `shared.ts`, `resolve-root.ts`) are NOT included. Scripts must resolve the plugin root dynamically or use `GEMSKILLS_ROOT`.

Source: [vercel-labs/skills installer.ts](https://github.com/vercel-labs/skills) — `installSkillForAgent` copies only the `skill.path` directory via `copyDirectory()`.

## OpenCode / Cursor / Gemini CLI

These tools discover skills from `~/.agents/skills/` (same as agentskills.io). They read `SKILL.md` files for instructions. Script execution depends on the tool's capabilities.

## CLAUDE_PLUGIN_ROOT

`${CLAUDE_PLUGIN_ROOT}` is a convention that Claude Code interprets at runtime — it is NOT a shell environment variable. It resolves to the plugin's install path in the cache. Use it in SKILL.md for cross-skill references:

```bash
cd ${CLAUDE_PLUGIN_ROOT}/skills/generate-image && bun run scripts/generate.ts "prompt"
```

Do NOT use:
- `${SKILL_DIR}` — not a real variable
- `${SKILL_BASE_DIR}/../sibling-skill` — breaks outside plugin cache
- Bare relative paths like `../browsing-styles/` — breaks from `~/.agents/skills/`

## GEMSKILLS_ROOT Environment Variable

Cross-platform escape hatch for environments without Claude Code's plugin system:

```bash
export GEMSKILLS_ROOT=/path/to/gemskills
```

Scripts check this first in their fallback chain.

## Script Resolution Order

Each script resolves the plugin root in this order:

1. **Relative path** — `import.meta.dir + "../../../resolve-root.ts"` (works from plugin cache / source repo)
2. **GEMSKILLS_ROOT** — environment variable (cross-platform)
3. **installed_plugins.json** — Claude Code's plugin registry
4. **Cache scan** — `~/.claude/plugins/cache/b-open-io/gemskills/<latest-semver>/`
5. **Fail with instructions** — tells user to set GEMSKILLS_ROOT or install the plugin

## Writing SKILL.md References

Always use `${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>` for cross-skill references:

```markdown
# Good
cd ${CLAUDE_PLUGIN_ROOT}/skills/browsing-styles && bun run scripts/list_styles.ts --table

# Bad - breaks from ~/.agents/skills/
bun run ../browsing-styles/scripts/list_styles.ts --table
cd ${SKILL_BASE_DIR}/../browsing-styles && bun run scripts/list_styles.ts
```

## Writing Scripts

Use the dynamic import pattern with catch handler:

```typescript
const { resolvePluginRoot } = await import(
  resolve(import.meta.dir, "../../../resolve-root.ts")
).catch(async () => {
  // Fallback chain: env var -> installed_plugins.json -> cache scan
  const _tryPaths = [process.env.GEMSKILLS_ROOT || ""];
  const home = process.env.HOME || process.env.USERPROFILE || "";
  // ... check installed_plugins.json and cache
  throw new Error("Cannot find gemskills. Set GEMSKILLS_ROOT or: claude plugin install gemskills@b-open-io");
});
const PLUGIN_ROOT = resolvePluginRoot(import.meta.dir);
```

Then import shared modules dynamically:
```typescript
const { callGeminiImage } = await import(resolve(PLUGIN_ROOT, "utils.ts")) as typeof import("../../../utils");
const { getApiKey, parseArgs } = await import(resolve(PLUGIN_ROOT, "shared.ts")) as typeof import("../../../shared");
```

The `as typeof import(...)` cast preserves type safety while allowing dynamic resolution.
