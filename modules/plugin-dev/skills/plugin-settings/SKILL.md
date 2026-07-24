---
name: plugin-settings
description: This skill should be used when the user asks to "add plugin settings", "make a plugin configurable", "store per-project plugin configuration", "use settings.local.json", "create a plugin state file", "expose skill settings in Agent Master", or "add a skill interface". Distinguishes official Claude Code settings from project-owned configuration and documents bOpen Agent Master skill interface discovery.
---

# Plugin Settings

Design plugin configuration without confusing Claude Code settings, plugin-bundled defaults, application-owned data, and Agent Master discovery metadata.

## Classify the Setting First

Place each value in the narrowest mechanism that actually owns it:

| Need | Mechanism | Scope |
|---|---|---|
| Configure Claude Code behavior, permissions, environment, or plugin enablement | Official `settings.json` hierarchy | User, project, local, or managed |
| Ship a supported Claude Code default with a plugin | `<plugin-root>/settings.json` | Plugin default |
| Describe or distribute the plugin | `.claude-plugin/plugin.json` | Plugin metadata |
| Collect per-user plugin options | `.claude-plugin/plugin.json` `userConfig` | User, CLI-supplied, or managed |
| Store project-owned settings or state interpreted by custom code | Project-owned file with an explicit schema and reader | Whatever the plugin defines |
| Advertise a skill-owned UI in the bOpen desktop configurator | `<plugin-root>/setup/manifest.json` `skillInterfaces` | Agent Master discovery |

Do not present a project-owned file as an official Claude Code settings source. Claude Code does not automatically discover, merge, validate, or reload arbitrary files merely because they live under `.claude/`.

## Use Official Claude Code Settings for Claude Code Behavior

Use these official settings locations:

- `~/.claude/settings.json` for personal settings across projects.
- `.claude/settings.json` for team-shared project settings committed to source control.
- `.claude/settings.local.json` for personal, project-specific overrides that stay out of source control.
- Managed settings for organization-enforced policy.

Apply precedence from highest to lowest: managed settings, command-line settings, local project settings, shared project settings, then user settings. Remember that some array-valued settings merge rather than replace lower-scope arrays.

Configure installed plugins through `enabledPlugins` and marketplaces through `extraKnownMarketplaces` in the official settings hierarchy. Select user, project, or local installation scope according to who should receive the plugin.

Add the official schema for editor validation when authoring settings:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "enabledPlugins": {
    "example@team-marketplace": true
  }
}
```

Verify loaded settings sources with `/status`. Do not infer the effective source of a value from a file's presence alone.

## Prefer `userConfig` for Per-User Plugin Options

Declare supported user options under `userConfig` in `.claude-plugin/plugin.json`. Claude Code prompts for these values when the plugin is enabled, rather than requiring hand edits:

```json
{
  "userConfig": {
    "api_endpoint": {
      "type": "string",
      "title": "API endpoint",
      "description": "The service endpoint used by this plugin",
      "required": true
    },
    "api_token": {
      "type": "string",
      "title": "API token",
      "description": "Authentication token for the service",
      "sensitive": true,
      "required": true
    }
  }
}
```

Use the documented `string`, `number`, `boolean`, `directory`, and `file` types. Apply `default`, `required`, numeric `min`/`max`, or string `multiple` only where appropriate.

Reference values as `${user_config.KEY}` in supported MCP, LSP, and hook fields. Substitute only non-sensitive values into skill and agent content. Read `CLAUDE_PLUGIN_OPTION_<KEY>` in hook processes where environment access is appropriate. Do not interpolate configured values into shell-form command fields; use exec-form arguments or read the exported environment variable so input cannot become shell syntax.

Let Claude Code manage persistence. Non-sensitive values live under `pluginConfigs[<plugin-id>].options` in user settings. Sensitive values use the macOS Keychain or Claude's credentials store on platforms without supported keychain integration. Do not ask users to edit `pluginConfigs` manually.

Treat `pluginConfigs` as user-level configuration. Current Claude Code reads it from user settings, `--settings`, and managed settings; project `.claude/settings.json` and `.claude/settings.local.json` entries are ignored. Use an explicitly project-owned format when configuration must vary by repository.

## Keep Plugin-Bundled Defaults Narrow

Use `<plugin-root>/settings.json` only for keys Claude Code documents as supported plugin defaults. At present, the supported keys are `agent` and `subagentStatusLine`; unknown keys are ignored. Do not invent a plugin-specific configuration schema in this file.

```json
{
  "agent": "security-reviewer"
}
```

Use `.claude-plugin/plugin.json` for plugin identity and supported manifest metadata. Keep hooks in `hooks/hooks.json`, MCP servers in `.mcp.json`, and other plugin components in their documented locations. Do not treat the plugin manifest as a general state store.

## Treat `.claude/<plugin>.local.md` as a Custom Convention

Use `.claude/<plugin-name>.local.md` only when a plugin deliberately owns a Markdown-plus-YAML configuration or state format. Label it as a **project-owned convention**, not a Claude Code feature.

This pattern remains useful when settings combine structured fields with substantial human-readable instructions:

```markdown
---
enabled: true
mode: standard
max_retries: 3
---

# Project context

Prefer deterministic validation before retrying.
```

Implement all behavior explicitly:

1. Define a versioned schema, types, defaults, and invalid-value behavior.
2. Read the file from the hook, command, agent tool, or server that consumes it.
3. Parse YAML with a real YAML library when values can be nested, quoted, or multiline.
4. Validate parsed values before using paths, commands, URLs, or numeric limits.
5. Add the exact file to `.gitignore` when it contains personal state.
6. Document whether the consumer reads on every invocation, watches the file, or requires a restart.

Do not claim that custom files always require a Claude Code restart. A hook or server that reads the file for each request sees changes immediately; a long-running process that caches it may not.

Prefer JSON for machine-only configuration. Use Markdown bodies only when prose is itself part of the contract. Separate durable configuration from transient runtime state when concurrent writers, migrations, or crash recovery matter.

Never store secrets in a Markdown state file or commit them to project settings. Prefer environment variables or the platform's secure credential mechanism, and expose only presence—not values—to diagnostic interfaces.

Store persistent generated data under `${CLAUDE_PLUGIN_DATA}` when it must survive plugin updates. Treat `${CLAUDE_PLUGIN_ROOT}` as versioned, read-only plugin content rather than a writable state directory.

Do not confuse `.claude/<plugin>.local.md` with the official `CLAUDE.local.md` memory file or `.claude/settings.local.json`. Those have different discovery rules and purposes.

## Expose Skill Interfaces in Agent Master

Declare an optional skill UI in the owning plugin's `setup/manifest.json`:

```json
{
  "plugin": "bopen-tools",
  "skillInterfaces": [
    {
      "skill": "visual-wayfinder",
      "label": "Open Visual Wayfinder",
      "description": "Explore the visual decision workbench and its interactive question formats."
    }
  ]
}
```

Treat `skillInterfaces` as the bOpen discovery contract:

- Set `skill` to the lowercase kebab-case skill slug.
- Keep `label` short and action-oriented.
- Use `description` for one concise explanation of the settings or interface surface.
- Let Agent Master derive the trusted bopen.ai destination from the plugin and skill slugs.
- Do not add arbitrary URLs to the manifest entry.
- Omit the entry when the skill has no useful user-facing interface.

A `skillInterfaces` entry advertises a destination; it does not persist configuration, grant capabilities, run a setup script, or imply that the skill needs a build step. Keep interface implementation and settings storage as separate decisions.

When adding the entry, validate `setup/manifest.json` against `skills/setup/assets/manifest.schema.json` and exercise the Agent Master plugin view. Confirm that the derived link targets the intended plugin and skill, opens safely in a new context, and remains useful when no local UI server is running.

## Implementation Workflow

1. Inventory every proposed value and its consumer.
2. Separate Claude Code settings, `userConfig`, plugin defaults, application configuration, secrets, and runtime state.
3. Choose the sharing scope: user, committed project, local project, or managed.
4. Define defaults and a validation schema before writing readers or UI controls.
5. Make malformed configuration fail informative and fall back only when the fallback is safe.
6. Add Agent Master discovery only for a real user-facing skill surface.
7. Test precedence, missing files, invalid values, upgrades, and concurrent access proportional to risk.
8. Document the authoritative source of truth and reload behavior.

## Verification Checklist

- Confirm that official Claude Code behavior uses a documented settings source.
- Confirm that per-user plugin options use `userConfig` unless its type, scope, or lifecycle is insufficient.
- Confirm that custom files are described as project-owned and have explicit readers.
- Confirm that plugin-root `settings.json` contains only supported default keys.
- Confirm that secrets never enter settings UI output, logs, Markdown, or committed files.
- Confirm that local files are ignored and shared files contain no machine-specific values.
- Confirm that `skillInterfaces` entries match the setup manifest schema and use no arbitrary URL.
- Confirm that the UI is a view/editor over an identified source of truth, not an independent copy.

## Primary References

- [Claude Code settings and precedence](https://code.claude.com/docs/en/settings)
- [Create plugins: plugin-bundled defaults](https://code.claude.com/docs/en/plugins)
- [Plugins reference: components, scopes, and manifests](https://code.claude.com/docs/en/plugins-reference)
- [Explore the `.claude` directory](https://code.claude.com/docs/en/claude-directory)

For the bOpen extension, inspect `setup/manifest.json` and `skills/setup/assets/manifest.schema.json` in the active plugin source rather than copying a stale schema into this skill.
