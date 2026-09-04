#!/usr/bin/env bun
import { existsSync, readFileSync, realpathSync, mkdirSync, renameSync, unlinkSync, writeFileSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadCatalog, pluginRoots } from './catalog.ts';

type State = { schema: 1; adapter: string; roots: string[] };
const marker = '// bopen-managed: ';
export function render(state: State): string {
  return marker + JSON.stringify(state) + '\n' +
    `import { createBopenPlugin } from ${JSON.stringify(pathToFileURL(join(state.adapter,'index.ts')).href)};\n` +
    `export default createBopenPlugin(${JSON.stringify(state.roots)});\n`;
}
export function install(options: { target: string; source: string; names: string[]; remove?: boolean; dryRun?: boolean }) {
  const target = resolve(options.target);
  const shim = join(target,'plugins','bopen.ts');
  let previous: State | undefined;
  if (existsSync(shim)) {
    if (lstatSync(shim).isSymbolicLink()) throw new Error(`Refusing to replace a symlink: ${shim}`);
    const raw = readFileSync(shim,'utf8');
    if (!raw.startsWith(marker)) throw new Error(`Existing plugin is not installer-owned: ${shim}`);
    previous = JSON.parse(raw.split('\n')[0].slice(marker.length));
    if (!previous || previous.schema !== 1 || !Array.isArray(previous.roots) || typeof previous.adapter !== 'string' || render(previous) !== raw) throw new Error(`Managed plugin was edited; preserve your changes before reinstalling: ${shim}`);
  }
  const pluginName = (root: string) => JSON.parse(readFileSync(join(root,'.claude-plugin/plugin.json'),'utf8')).name as string;
  const selected = options.remove ? [] : pluginRoots(options.source, options.names);
  const replace = new Set(options.remove ? options.names : selected.map(pluginName));
  const roots = options.remove && replace.has('all') ? [] : [...(previous?.roots ?? []).filter(root => !replace.has(pluginName(root)) && !(options.remove && replace.has('all'))), ...selected];
  const catalog = loadCatalog(roots); // Validate everything before writing anything.
  const state: State = { schema:1, adapter:realpathSync(import.meta.dir), roots };
  if (!options.dryRun) {
    if (!roots.length) { if (previous) unlinkSync(shim); }
    else {
      mkdirSync(dirname(shim),{recursive:true});
      const tmp = shim + `.tmp-${process.pid}`;
      try { writeFileSync(tmp,render(state),{flag:'wx', mode:0o600}); renameSync(tmp,shim); }
      finally { if (existsSync(tmp)) unlinkSync(tmp); }
    }
  }
  return { entrypoint:shim, plugins:roots.map(pluginName), agents:Object.keys(catalog.agent), commands:Object.keys(catalog.command), skillPaths:catalog.skillPaths, mcp:Object.keys(catalog.mcp), warnings:catalog.warnings, dryRun:!!options.dryRun };
}
if (import.meta.main) {
  try {
    const { values } = parseArgs({ args:process.argv.slice(2), options:{
      source:{type:'string'}, plugin:{type:'string',multiple:true}, all:{type:'boolean'},
      project:{type:'string'}, global:{type:'boolean'}, uninstall:{type:'boolean'},
      'dry-run':{type:'boolean'}, help:{type:'boolean'},
    }, strict:true });
    if (values.help) {
      console.log('bun opencode/install.ts [--source CHECKOUT] (--plugin NAME ... | --all) [--project PATH | --global] [--uninstall] [--dry-run]\nDefault scope: current project. Keeps your existing OpenCode configuration. Requires a persistent source checkout, Bun, Python 3, bash and jq for core hooks. Restart OpenCode after changes.');
    } else {
      if (values.global && values.project) throw new Error('Choose --project or --global, not both.');
      const names = values.all ? ['all'] : values.plugin ?? [];
      if (!names.length) throw new Error('Select --plugin NAME or --all.');
      const target = values.global ? join(process.env.XDG_CONFIG_HOME ?? join(homedir(),'.config'),'opencode') : join(resolve(values.project ?? process.cwd()),'.opencode');
      console.log(JSON.stringify(install({target, source:resolve(values.source ?? join(import.meta.dir,'..')), names, remove:values.uninstall, dryRun:values['dry-run']}),null,2));
    }
  } catch (error) { console.error(String(error)); process.exitCode = 1; }
}
