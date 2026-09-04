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
      // Never convert a source allowlist into permission grants. Native user rules win.
      const denied = typeof meta.disallowedTools === 'string' ? meta.disallowedTools.split(/[ ,]+/) : meta.disallowedTools;
      const tools: Record<string,string> = { Bash:'bash', Read:'read', Write:'edit', Edit:'edit', MultiEdit:'edit', apply_patch:'edit', Grep:'grep', Glob:'glob', WebSearch:'websearch', WebFetch:'webfetch', Task:'task', Agent:'task', Skill:'skill' };
      if (Array.isArray(denied)) {
        const unknown = denied.filter(t => !tools[t]);
        if (unknown.length) throw new Error(`${id}: cannot preserve disallowed tools ${unknown.join(', ')}`);
        result.agent[id].permission = Object.fromEntries(denied.map(t => [tools[t], 'deny']));
      }
      const allowed = typeof meta.tools === 'string' ? meta.tools.split(/[ ,]+/) : meta.tools;
      if (Array.isArray(allowed)) {
        const native = new Set(allowed.map(t => tools[t]).filter(Boolean));
        for (const key of ['bash','read','edit','glob','grep','webfetch','websearch','task','skill']) {
          if (!native.has(key)) (result.agent[id].permission ??= {})[key] = 'deny';
        }
      }
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
      // User configuration is authoritative, including explicit disabled entries.
      config[key][id] = config[key][id] === undefined ? value : { ...value, ...config[key][id] };
    }
  }
  config.skills ??= {};
  config.skills.paths = [...new Set([...(config.skills.paths ?? []), ...catalog.skillPaths])];
}
