import { existsSync, readFileSync, realpathSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export type Catalog = { roots: string[]; agent: Record<string, any>; command: Record<string, any>; skillPaths: string[]; mcp: Record<string, any>; warnings: string[] };
const validName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PRELUDE = `You are running in OpenCode. Use native tools: bash, read, edit, write, glob, grep, webfetch, skill, task, todowrite. Load Skill(name) using the native skill tool (use the skill's unqualified name). Delegate Agent/Task roles using task with the installed bopen-<plugin>-<role> subagent_type. Source Claude model aliases are informational: inherit this session's model unless the user configures an OpenCode override. User permissions still apply. Resolve plugin-relative resources from the source root below.\n`;
function contained(root: string, path: string): string {
  const actual = realpathSync(path);
  if (actual !== root && !actual.startsWith(root + sep)) throw new Error(`Plugin asset escapes its source root: ${path}`);
  return actual;
}
export function markdown(path: string): { meta: Record<string, any>; body: string } {
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { meta: {}, body: raw };
  const meta = Bun.YAML.parse(match[1]);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error(`Invalid frontmatter: ${path}`);
  return { meta: meta as Record<string, any>, body: raw.slice(match[0].length) };
}
export function pluginRoots(source: string, names: string[]): string[] {
  source = realpathSync(source);
  const available = [source, ... (existsSync(join(source, 'modules')) ? readdirSync(join(source, 'modules')).sort().map(n => join(source, 'modules', n)) : [])]
    .filter(p => existsSync(join(p, '.claude-plugin/plugin.json')));
  const byName = new Map(available.map(p => [JSON.parse(readFileSync(join(p, '.claude-plugin/plugin.json'), 'utf8')).name, p]));
  const selected = names.includes('all') ? [...byName.keys()] : names;
  if (!selected.length) throw new Error('Select --plugin <name> or --all.');
  return [...new Set(selected)].map(name => {
    const root = byName.get(name);
    if (!root) throw new Error(`Unknown plugin ${name}; available: ${[...byName.keys()].join(', ')}`);
    return contained(source, root);
  });
}
function files(root: string, dir: string, extension: string): string[] {
  if (!existsSync(dir)) return [];
  contained(root, dir);
  return readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(e => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return files(root, p, extension);
    if (e.isFile() && e.name.endsWith(extension)) return [contained(root, p)];
    return [];
  });
}
function substitute(value: string, root: string): string {
  return value.replaceAll('${CLAUDE_PLUGIN_ROOT}', root).replaceAll('${BOPEN_PLUGIN_ROOT}', root)
    .replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g, (_, key, fallback) => {
      const result = process.env[key] ?? fallback;
      if (result === undefined) throw new Error(`Missing environment variable ${key}`);
      return result;
    });
}

type PermissionRule = 'allow' | 'ask' | 'deny';
type PermissionValue = PermissionRule | Record<string, PermissionRule>;
type ToolSpec = { name: string; specifier?: string; malformed?: boolean };

const nativeToolNames: Record<string, string> = {
  Bash: 'bash',
  Read: 'read',
  Write: 'edit',
  Edit: 'edit',
  MultiEdit: 'edit',
  apply_patch: 'edit',
  Grep: 'grep',
  Glob: 'glob',
  WebSearch: 'websearch',
  WebFetch: 'webfetch',
  Task: 'task',
  Agent: 'task',
  Skill: 'skill',
};
const permissionKeys = ['bash', 'read', 'edit', 'glob', 'grep', 'webfetch', 'websearch', 'task', 'skill'];

function splitToolMetadata(value: unknown, id: string, field: string, warnings: string[]): string[] {
  if (value === undefined || value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  const tokens: string[] = [];
  for (const entry of values) {
    if (typeof entry !== 'string') {
      warnings.push(`${id}: unsupported ${field} entry ${JSON.stringify(entry)}; denied.`);
      continue;
    }
    let token = '';
    let depth = 0;
    let malformed = false;
    const flush = () => {
      const trimmed = token.trim();
      if (trimmed) tokens.push(trimmed);
      token = '';
    };
    for (const character of entry) {
      if (character === '(') depth += 1;
      if (character === ')') depth -= 1;
      if (depth < 0) {
        malformed = true;
        break;
      }
      if ((character === ',' || /\s/.test(character)) && depth === 0) flush();
      else token += character;
    }
    if (malformed || depth !== 0) {
      const name = entry.trim().split(/[\s,(]/, 1)[0];
      tokens.push(name ? `${name}(` : entry.trim());
    } else flush();
  }
  return tokens;
}

function parseToolSpec(raw: string): ToolSpec {
  const open = raw.indexOf('(');
  if (open === -1) return { name: raw };
  if (!raw.endsWith(')') || open === 0) return { name: raw.slice(0, open) || raw, malformed: true };
  return { name: raw.slice(0, open), specifier: raw.slice(open + 1, -1).trim() };
}

function warning(warnings: string[], id: string, field: string, raw: string, reason: string): void {
  warnings.push(`${id}: cannot translate ${field} entry ${raw}: ${reason}; denied.`);
}

function bashPatterns(specifier: string): string[] | undefined {
  if (!specifier || specifier.includes('(') || specifier.includes(')') || specifier.includes(':')) {
    if (specifier.endsWith(':*')) {
      const command = specifier.slice(0, -2);
      if (command && !command.includes(':')) return [command, `${command} *`];
    }
    return undefined;
  }
  // Claude's trailing space-wildcard also matches the command without arguments.
  if (specifier.endsWith(' *')) {
    const command = specifier.slice(0, -2);
    return command ? [command, specifier] : undefined;
  }
  return [specifier];
}

function ruleMap(value: PermissionValue): Record<string, PermissionRule> {
  return typeof value === 'string' ? { '*': value } : { ...value };
}

function addRule(permission: Record<string, PermissionValue>, key: string, pattern: string, action: PermissionRule): void {
  const existing = permission[key];
  const rules = existing === undefined ? {} : ruleMap(existing);
  setRule(rules, pattern, action);
  permission[key] = rules;
}

function setRule(rules: Record<string, PermissionRule>, pattern: string, action: PermissionRule): void {
  delete rules[pattern];
  Object.defineProperty(rules, pattern, { value: action, enumerable: true, configurable: true, writable: true });
}

function simplePattern(pattern: string): boolean {
  // Intersect exact names and trailing command prefixes; reject richer globs.
  return pattern === '*' || (!pattern.includes('*') && !pattern.includes('?')) || (pattern.endsWith(' *') && !pattern.slice(0, -2).includes('*') && !pattern.slice(0, -2).includes('?'));
}

function matchesPattern(pattern: string, candidate: string): boolean {
  if (pattern === '*' || pattern === candidate) return true;
  if (!pattern.endsWith(' *')) return false;
  const command = pattern.slice(0, -2);
  return Boolean(command) && candidate.startsWith(`${command} `);
}

function matchingRule(rules: Record<string, PermissionRule>, candidate: string): PermissionRule | undefined {
  let action: PermissionRule | undefined;
  for (const [pattern, value] of Object.entries(rules)) if (matchesPattern(pattern, candidate)) action = value;
  return action;
}

function cappedAction(action: PermissionRule, inherited: PermissionRule | undefined): PermissionRule {
  if (inherited === 'deny' || action === 'deny') return 'deny';
  if (inherited === 'ask' && action === 'allow') return 'ask';
  return action;
}

function clampRules(value: PermissionValue, inherited: PermissionRule | Record<string, PermissionRule>): PermissionValue {
  if (inherited === 'deny') return 'deny';
  if (inherited === 'allow') return value;
  if (inherited === 'ask') {
    if (value === 'deny') return value;
    if (value === 'allow') return 'ask';
    const rules = { ...value };
    for (const [pattern, action] of Object.entries(rules)) if (action === 'allow') rules[pattern] = 'ask';
    return rules;
  }
  if (value === 'deny') return value;
  const entries = Object.entries(inherited);
  if (!entries.length) return value;
  if (entries.length === 1 && entries[0][0] === '*') return clampRules(value, entries[0][1]);
  const source = ruleMap(value);
  for (const pattern of [...Object.keys(source), ...Object.keys(inherited)]) {
    if (!simplePattern(pattern)) throw new Error(`Cannot safely combine unsupported OpenCode permission pattern ${pattern}; configure this agent explicitly.`);
  }
  // Exact names and trailing command prefixes form nested or disjoint scopes.
  // Emit their union broadest-first, evaluating each original ordered policy
  // independently so a later exception cannot erase the other policy's deny.
  const patterns = [...new Set([...Object.keys(source), ...Object.keys(inherited)])]
    .sort((a, b) => {
      const width = (p: string) => p.endsWith('*') ? p.length - 1 : p.length;
      return width(a) - width(b) || Number(b.endsWith('*')) - Number(a.endsWith('*')) || a.localeCompare(b);
    });
  const rules: Record<string, PermissionRule> = {};
  for (const pattern of patterns) {
    setRule(rules, pattern, cappedAction(matchingRule(source, pattern) ?? 'allow', matchingRule(inherited, pattern)));
  }
  return rules;
}

// Native OpenCode matches permission names and input patterns in insertion order.
function matchesTool(pattern: string, tool: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replaceAll('*', '.*').replaceAll('?', '.') + '$').test(tool);
}

function userRulesFor(tool: string, ...policies: any[]): Record<string, PermissionRule> {
  const rules: Record<string, PermissionRule> = {};
  for (const policy of policies) {
    if (typeof policy === 'string') {
      setRule(rules, '*', policy as PermissionRule);
    } else if (policy && typeof policy === 'object' && !Array.isArray(policy)) {
      for (const [pattern, value] of Object.entries(policy)) {
        if (!matchesTool(pattern, tool)) continue;
        for (const [input, action] of Object.entries(ruleMap(value as PermissionValue))) {
          setRule(rules, input, action);
        }
      }
    }
  }
  const entries = Object.entries(rules);
  const catchAll = entries.findIndex(([pattern]) => pattern === '*');
  return Object.fromEntries(entries.slice(Math.max(0, catchAll))); // earlier rules are shadowed

}

function mergeAgent(value: any, existing: any, inheritedPermission?: any): any {
  const merged = { ...value, ...existing };
  if (value?.permission === undefined) return merged;
  // User agent rules override user global rules, as on the native host. The
  // source agent's tool restrictions are an independent upper bound on both.
  const permission: Record<string, PermissionValue> = existing?.permission === undefined
    ? {} : typeof existing.permission === 'string'
      ? { '*': existing.permission } : { ...existing.permission };
  for (const [tool, source] of Object.entries(value.permission)) {
    const effectiveUserRules = userRulesFor(tool, inheritedPermission, existing?.permission);
    const constrained = clampRules(source as PermissionValue, effectiveUserRules);
    delete permission[tool];
    permission[tool] = constrained;
  }
  merged.permission = permission;
  return merged;
}

function nativeSkillScope(specifier: string): string | undefined {
  if (!specifier || /[()\s]/.test(specifier)) return undefined;
  if (!specifier.includes(':')) return specifier;
  const parts = specifier.split(':');
  // OpenCode names skills without their Claude plugin qualifier. A namespace
  // wildcard cannot be mapped to '*' without allowing unrelated skills.
  if (parts.length !== 2 || !validName.test(parts[0]) || !validName.test(parts[1])) return undefined;
  return parts[1];
}

export function loadCatalog(roots: string[]): Catalog {
  const result: Catalog = { roots, agent: {}, command: {}, skillPaths: [], mcp: {}, warnings: [] };
  for (const source of roots) {
    const root = realpathSync(source);
    const manifest = JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'));
    const name = manifest.name;
    if (typeof name !== 'string' || !validName.test(name)) throw new Error(`Invalid plugin name: ${name}`);
    for (const kind of ['agents', 'commands', 'skills']) {
      if (manifest[kind] && manifest[kind] !== `./${kind}/` && manifest[kind] !== `./${kind}`) {
        throw new Error(`${name}: custom ${kind} paths need an explicit adapter; refusing an incomplete install.`);
      }
    }
    const prefix = `bopen-${name}-`;
    for (const path of files(root, join(root, 'agents'), '.md')) {
      const {meta,body} = markdown(path);
      const id = prefix + relative(join(root,'agents'),path).slice(0,-3).split(sep).join('-');
      if (!meta.description) throw new Error(`Missing agent description: ${path}`);
      result.agent[id] = { description: String(meta.description), mode: 'subagent', prompt: PRELUDE + `Source root: ${root}\n\n` + body.replaceAll('${CLAUDE_PLUGIN_ROOT}', root) };
      const allowed = splitToolMetadata(meta.tools, id, 'tools', result.warnings);
      const denied = splitToolMetadata(meta.disallowedTools, id, 'disallowedTools', result.warnings);
      const hasAllowlist = meta.tools !== undefined && meta.tools !== null;
      const permission: Record<string, PermissionValue> = {};
      const allowedNative = new Set<string>();
      for (const raw of allowed) {
        const parsed = parseToolSpec(raw);
        const key = nativeToolNames[parsed.name];
        if (!key) {
          if (raw.includes('(')) warning(result.warnings, id, 'tools', raw, 'unknown tool');
          continue;
        }
        if (parsed.malformed || parsed.specifier === undefined && raw.includes('(')) {
          warning(result.warnings, id, 'tools', raw, 'malformed scoped syntax');
          permission[key] = 'deny';
          continue;
        }
        if (parsed.specifier === undefined) {
          allowedNative.add(key);
          continue;
        }
        if (parsed.name === 'Bash') {
          const patterns = bashPatterns(parsed.specifier);
          if (!patterns) {
            warning(result.warnings, id, 'tools', raw, 'unsupported Bash scope');
            permission[key] = 'deny';
            continue;
          }
          for (const pattern of patterns) addRule(permission, key, pattern, 'allow');
        } else if (parsed.name === 'Skill') {
          const scope = nativeSkillScope(parsed.specifier);
          if (!scope) {
            warning(result.warnings, id, 'tools', raw, 'unsupported Skill scope');
            permission[key] = 'deny';
            continue;
          }
          addRule(permission, key, scope, 'allow');
        } else {
          warning(result.warnings, id, 'tools', raw, `unsupported ${parsed.name} scope`);
          permission[key] = 'deny';
        }
      }
      if (hasAllowlist) {
        for (const key of permissionKeys) {
          if (!allowedNative.has(key) && permission[key] === undefined) permission[key] = 'deny';
          else if (!allowedNative.has(key) && typeof permission[key] === 'object' && permission[key]['*'] !== 'allow') permission[key] = { '*': 'deny', ...permission[key] };
        }
      }
      for (const raw of denied) {
        const parsed = parseToolSpec(raw);
        const key = nativeToolNames[parsed.name];
        if (!key) throw new Error(`${id}: cannot preserve disallowed tool ${raw}`);
        if (parsed.specifier === undefined && !parsed.malformed) {
          permission[key] = 'deny';
          continue;
        }
        if (parsed.malformed || parsed.specifier === undefined) {
          warning(result.warnings, id, 'disallowedTools', raw, 'malformed scoped syntax');
          permission[key] = 'deny';
          continue;
        }
        if (parsed.name === 'Bash') {
          const patterns = bashPatterns(parsed.specifier);
          if (!patterns) {
            warning(result.warnings, id, 'disallowedTools', raw, 'unsupported Bash scope');
            permission[key] = 'deny';
            continue;
          }
          for (const pattern of patterns) addRule(permission, key, pattern, 'deny');
        } else if (parsed.name === 'Skill') {
          const scope = nativeSkillScope(parsed.specifier);
          if (!scope) {
            warning(result.warnings, id, 'disallowedTools', raw, 'unsupported Skill scope');
            permission[key] = 'deny';
            continue;
          }
          addRule(permission, key, scope, 'deny');
        } else {
          warning(result.warnings, id, 'disallowedTools', raw, `unsupported ${parsed.name} scope`);
          permission[key] = 'deny';
        }
      }
      for (const key of permissionKeys) {
        if (typeof permission[key] === 'object') {
          if (permission[key]['*'] === undefined) permission[key] = { '*': 'allow', ...permission[key] };
          // A redundant scoped entry beside a bare tool grant adds no native
          // permission; defer to the host instead of overwriting its defaults.
          if (allowedNative.has(key) && Object.values(permission[key]).every(action => action === 'allow')) delete permission[key];
        }
      }
      if (Object.keys(permission).length) result.agent[id].permission = permission;
    }
    for (const path of files(root, join(root,'commands'), '.md')) {
      const {meta,body} = markdown(path);
      const id = prefix + relative(join(root,'commands'),path).slice(0,-3).split(sep).join('-');
      result.command[id] = { description: String(meta.description ?? id), template: PRELUDE + `Source root: ${root}\n\n` + body.replaceAll('${CLAUDE_PLUGIN_ROOT}',root) };
    }
    if (existsSync(join(root,'skills'))) {
      const skillRoot = contained(root, join(root,'skills'));
      for (const file of new Bun.Glob('**/SKILL.md').scanSync({cwd:skillRoot, followSymlinks:true})) contained(root, join(skillRoot,file));
      result.skillPaths.push(skillRoot);
    }
    const mcpPath = manifest.mcpServers;
    const mcpFile = typeof mcpPath === 'string' ? contained(root, resolve(root,mcpPath)) : join(root,'.mcp.json');
    const mcps = mcpPath && typeof mcpPath === 'object' ? mcpPath : existsSync(mcpFile) ? JSON.parse(readFileSync(contained(root,mcpFile),'utf8')) : {};
    for (const [key, raw] of Object.entries(mcps.mcpServers ?? mcps)) {
      const server = raw as any;
      const id = prefix + key;
      try {
        if (typeof server.command === 'string') {
          result.mcp[id] = { type:'local', command: [server.command, ...(server.args ?? [])].map((v:string) => substitute(v,root)), environment: Object.fromEntries(Object.entries(server.env ?? {}).map(([k,v])=>[k,substitute(String(v),root)])), enabled:true };
        } else if (typeof server.url === 'string' && (!server.type || ['http','sse'].includes(server.type))) {
          result.mcp[id] = { type:'remote', url:substitute(server.url,root), headers:Object.fromEntries(Object.entries(server.headers ?? {}).map(([k,v])=>[k,substitute(String(v),root)])), enabled:true };
        } else throw new Error('Unsupported MCP transport');
      } catch (error) { result.warnings.push(`${id}: ${String(error)}. Configure this MCP server in OpenCode to enable it.`); }
    }
    if (manifest.hooks && name !== 'core') result.warnings.push(`${name}: custom hook registry is not translated. Only core's reviewed hook bridge is supported.`);
    if (manifest.apps) result.warnings.push(`${name}: host-specific apps are not portable to OpenCode.`);
  }
  return result;
}
export function applyCatalog(config: any, catalog: Catalog) {
  for (const key of ['agent','command','mcp'] as const) {
    config[key] ??= {};
    for (const [id, value] of Object.entries(catalog[key])) {
      // Preserve user configuration; source agent tool restrictions remain enforced.
      config[key][id] = key === 'agent'
        ? mergeAgent(value, config[key][id], config.permission)
        : config[key][id] === undefined ? value : { ...value, ...config[key][id] };
    }
  }
  config.skills ??= {};
  config.skills.paths = [...new Set([...(config.skills.paths ?? []), ...catalog.skillPaths])];
}
