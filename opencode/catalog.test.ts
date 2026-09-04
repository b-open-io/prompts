import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCatalog, applyCatalog, pluginRoots } from './catalog.ts';
import { install } from './install.ts';
const temps: string[] = [];
function fixture(name='demo') {
  const root = realpathSync(mkdtempSync(join(tmpdir(),'bopen-native-'))); temps.push(root);
  for (const dir of ['.claude-plugin','agents','commands','skills/demo']) mkdirSync(join(root,dir),{recursive:true});
  writeFileSync(join(root,'.claude-plugin/plugin.json'),JSON.stringify({name,version:'1.0.0'}));
  writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Review safely\nmodel: opus\ndisallowedTools: [Bash]\n---\nReview the source.');
  writeFileSync(join(root,'commands/check.md'),'---\ndescription: Check changes\n---\nReview $ARGUMENTS');
  return root;
}
afterEach(()=>{for(const p of temps.splice(0)) rmSync(p,{recursive:true,force:true});});
test('native catalog provides agents, commands, whole skill folders, and MCP with inherited models',()=>{
  const root=fixture();
  writeFileSync(join(root,'.mcp.json'),JSON.stringify({mcpServers:{server:{command:'node',args:['${CLAUDE_PLUGIN_ROOT}/server.js']}}}));
  const catalog=loadCatalog([root]);
  expect(catalog.agent['bopen-demo-reviewer'].model).toBeUndefined();
  expect(catalog.agent['bopen-demo-reviewer'].permission.bash).toBe('deny');
  expect(catalog.command['bopen-demo-check'].template).toContain('$ARGUMENTS');
  expect(catalog.skillPaths).toEqual([join(root,'skills')]);
  expect(catalog.mcp['bopen-demo-server'].command).toEqual(['node',`${root}/server.js`]);
  const config:any={agent:{'bopen-demo-reviewer':{model:'openai/custom'}},mcp:{'bopen-demo-server':{enabled:false}},permission:{bash:'ask'},skills:{paths:['existing']}};
  applyCatalog(config,catalog); applyCatalog(config,catalog);
  expect(config.agent['bopen-demo-reviewer'].model).toBe('openai/custom');
  expect(config.mcp['bopen-demo-server'].enabled).toBe(false);
  expect(config.permission).toEqual({bash:'ask'});
  expect(config.skills.paths).toEqual(['existing',join(root,'skills')]);
});
test('missing MCP credentials are reported without inventing secrets',()=>{
  const root=fixture();
  writeFileSync(join(root,'.mcp.json'),JSON.stringify({mcpServers:{server:{url:'https://example.com',headers:{Authorization:'${BOPEN_TEST_MISSING_CREDENTIAL_123}'}}}}));
  const result=loadCatalog([root]);
  expect(result.mcp).toEqual({}); expect(result.warnings[0]).toContain('Missing environment variable');
});
test('installer adds modules, preserves user configuration, detects modified files and removes only its shim',()=>{
  const root=fixture(); const other=fixture('second'); const target=join(root,'target');
  mkdirSync(target); writeFileSync(join(target,'opencode.jsonc'),'// keep comments\n{}');
  install({target,source:root,names:['demo']});
  const result=install({target,source:other,names:['second']});
  expect(result.plugins).toEqual(['demo','second']);
  const shim=join(target,'plugins/bopen.ts'); const original=readFileSync(shim,'utf8');
  writeFileSync(shim,original+'// user edit');
  expect(()=>install({target,source:root,names:['demo']})).toThrow('edited');
  writeFileSync(shim,original);
  expect(install({target,source:root,names:['demo'],remove:true}).plugins).toEqual(['second']);
  expect(install({target,source:root,names:['all'],remove:true}).plugins).toEqual([]);
  expect(readFileSync(join(target,'opencode.jsonc'),'utf8')).toBe('// keep comments\n{}');
});
test('scope selection rejects unknown plugins and never silently selects every module',()=>{
  const root=fixture();
  expect(pluginRoots(root,['demo'])).toEqual([root]);
  expect(()=>pluginRoots(root,['missing'])).toThrow('Unknown plugin');
  expect(()=>pluginRoots(root,[])).toThrow('Select');
});
test('unsupported explicit source layouts fail before installation',()=>{
 const root=fixture(); writeFileSync(join(root,'.claude-plugin/plugin.json'),JSON.stringify({name:'demo',agents:['./elsewhere']}));
 expect(()=>install({target:join(root,'target'),source:root,names:['demo']})).toThrow('custom agents paths');
});

test('source tool restrictions use native permissions without granting tools',()=>{
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Read only\ntools: Read, Grep, Glob\ndisallowedTools: [Write, WebSearch]\n---\nReview.');
 const agent=loadCatalog([root]).agent['bopen-demo-reviewer'];
 expect(agent.permission.edit).toBe('deny'); expect(agent.permission.bash).toBe('deny');
 expect(agent.permission.read).toBeUndefined(); expect(agent.permission.websearch).toBe('deny');
});
test('uninstall all recovers even after source checkout is removed',()=>{
 const root=fixture(); const target=fixture('target');
 install({target,source:root,names:['demo']}); rmSync(root,{recursive:true,force:true});
 expect(install({target,source:root,names:['all'],remove:true}).plugins).toEqual([]);
});
test('default MCP symlinks cannot escape the source',async()=>{
 const root=fixture(),other=fixture('other');
 writeFileSync(join(other,'outside.json'),'{}');
 const {symlinkSync}=await import('node:fs');symlinkSync(join(other,'outside.json'),join(root,'.mcp.json'));
 expect(()=>loadCatalog([root])).toThrow('escapes');
});
