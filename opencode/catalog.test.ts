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
test('scoped Bash and Skill metadata preserves native allowlists and explicit denies',()=>{
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Scoped review\ntools: Read, Bash(git:*), Skill(semgrep), Skill(codeql), Skill(review:visual-review)\ndisallowedTools: Skill(codeql)\n---\nReview.');
 const agent=loadCatalog([root]).agent['bopen-demo-reviewer'];
 expect(agent.permission.read).toBeUndefined();
 expect(agent.permission.bash).toEqual({'git':'allow','git *':'allow','*':'deny'});
 expect(Object.keys(agent.permission.bash)).toEqual(['*','git','git *']);
 expect(agent.permission.skill).toEqual({'semgrep':'allow','codeql':'deny','visual-review':'allow','*':'deny'});
 expect(Object.keys(agent.permission.skill)).toEqual(['*','semgrep','visual-review','codeql']);
 expect(agent.permission.edit).toBe('deny');
 expect(agent.permission.webfetch).toBe('deny');
});
test('plain Bash and Skill stay broad while scoped disallowed rules remain narrow',()=>{
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Broad review\ntools: [Bash, Skill]\ndisallowedTools: [Bash(git:*)]\n---\nReview.');
 const agent=loadCatalog([root]).agent['bopen-demo-reviewer'];
 expect(agent.permission.bash).toEqual({'git':'deny','git *':'deny','*':'allow'});
 expect(agent.permission.skill).toBeUndefined();
 expect(agent.permission.read).toBe('deny');
});
test('unsupported scoped metadata warns and fails closed',()=>{
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Unsupported scopes\ntools: Bash(git:legacy), Skill(), Read(./notes.md)\ndisallowedTools: Bash(git:legacy)\n---\nReview.');
 const catalog=loadCatalog([root]);
 const agent=catalog.agent['bopen-demo-reviewer'];
 expect(agent.permission.bash).toBe('deny');
 expect(agent.permission.skill).toBe('deny');
 expect(agent.permission.read).toBe('deny');
 expect(catalog.warnings.filter(message=>message.includes('cannot translate')).length).toBe(4);
});
test('agent permission maps merge without dropping catalog rules or user restrictions',()=>{
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Scoped review\ntools: Read, Bash(git:*)\n---\nReview.');
 const catalog=loadCatalog([root]);
 const config:any={agent:{'bopen-demo-reviewer':{model:'openai/custom',permission:{bash:{'*':'deny'},read:'ask'}}},permission:{read:'deny'}};
 applyCatalog(config,catalog);
 expect(config.agent['bopen-demo-reviewer'].model).toBe('openai/custom');
 expect(config.agent['bopen-demo-reviewer'].permission.bash).toBe('deny');
 expect(config.agent['bopen-demo-reviewer'].permission.read).toBe('ask');
 expect(config.permission).toEqual({read:'deny'});
 applyCatalog(config,catalog);
 expect(config.agent['bopen-demo-reviewer'].permission).toEqual({bash:'deny',read:'ask',edit:'deny',glob:'deny',grep:'deny',webfetch:'deny',websearch:'deny',task:'deny',skill:'deny'});
});
test('inherited global deny and ask rules clamp scoped grants',()=>{
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Scoped review\ntools: Bash(git:*), Skill(semgrep), Skill(codeql)\n---\nReview.');
 const catalog=loadCatalog([root]);
 const denied:any={permission:{bash:'deny',skill:'ask'}};
 applyCatalog(denied,catalog);
 expect(denied.agent['bopen-demo-reviewer'].permission.bash).toBe('deny');
 expect(denied.agent['bopen-demo-reviewer'].permission.skill).toEqual({'*':'deny',semgrep:'ask',codeql:'ask'});
 const patterned:any={permission:{bash:{'*':'ask','git *':'deny'}}};
 applyCatalog(patterned,catalog);
 expect(patterned.agent['bopen-demo-reviewer'].permission.bash).toEqual({'*':'deny',git:'ask','git *':'deny'});
 const approved:any={permission:{bash:{'*':'deny','git *':'allow'}}};
 applyCatalog(approved,catalog);
 expect(approved.agent['bopen-demo-reviewer'].permission.bash).toEqual({'*':'deny',git:'deny','git *':'allow'});
 const approvedWithPrompt:any={permission:{bash:{'*':'ask','git *':'allow'}}};
 applyCatalog(approvedWithPrompt,catalog);
 expect(approvedWithPrompt.agent['bopen-demo-reviewer'].permission.bash).toEqual({'*':'deny',git:'ask','git *':'allow'});
 const explicitTool:any={permission:{'*':'deny',bash:'allow'}};
 applyCatalog(explicitTool,catalog);
 expect(explicitTool.agent['bopen-demo-reviewer'].permission.bash).toEqual({'*':'deny',git:'allow','git *':'allow'});
 const unsupportedGlobal:any={permission:{bash:{'*':'deny','*push*':'allow'}}};
 expect(() => applyCatalog(unsupportedGlobal,catalog)).toThrow('unsupported OpenCode permission pattern');
 const repeated:any={permission:{bash:'ask'}};
 applyCatalog(repeated,catalog);
 const firstPermission=structuredClone(repeated.agent['bopen-demo-reviewer'].permission);
 applyCatalog(repeated,catalog);
 expect(repeated.agent['bopen-demo-reviewer'].permission).toEqual(firstPermission);
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

test('combined command scopes never weaken either ordered policy', () => {
 const root=fixture();
 writeFileSync(join(root,'agents/reviewer.md'),'---\ndescription: Scoped review\ntools: Bash(git:*)\ndisallowedTools: Bash(git commit secret:*)\n---\nReview.');
 const catalog=loadCatalog([root]);
 const policies = [
  {'*':'deny','git commit *':'allow'},
  {'*':'ask','git *':'allow','git commit *':'deny'},
  {'git *':'allow','*':'deny'},
  {'*':'allow','git commit *':'ask'},
 ];
 const action = (rules:any, command:string):string => {
  if(typeof rules==='string') return rules;
  let value='allow';
  for(const [pattern,next] of Object.entries(rules)) {
   const matches=pattern==='*'||pattern===command||(pattern.endsWith(' *')&&command.startsWith(pattern.slice(0,-1)));
   if(matches) value=next as string;
  }
  return value;
 };
 const severity:any={allow:0,ask:1,deny:2};
 const source=catalog.agent['bopen-demo-reviewer'].permission.bash;
 for(const policy of policies) {
  const config:any={permission:{bash:policy}};
  applyCatalog(config,catalog);
  for(const command of ['git','git status','git commit','git commit file','git commit secret','git commit secret file','rm file']) {
   const expected=Math.max(severity[action(source,command)],severity[action(policy,command)]);
   expect(severity[action(config.agent['bopen-demo-reviewer'].permission.bash,command)]).toBe(expected);
  }
 }
});


test('ordered native user policies cannot erase source restrictions',()=>{
 const root=fixture();
 const action=(rules:any,input:string):string=>{
  if(typeof rules==='string') return rules;
  let result='allow';
  for(const [pattern,value] of Object.entries(rules??{})) {
   const re=pattern.split('*').map(part=>part.split('?').map(text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.')).join('.*');
   if(new RegExp('^'+re+'$').test(input)) result=value as string;
  }
  return result;
 };
 const policy=(tools:string,disallowed:string,global:any,user:any={})=>{
  writeFileSync(join(root,'agents/reviewer.md'),`---\ndescription: Test\ntools: ${tools}\ndisallowedTools: ${disallowed}\n---\nReview`);
  const catalog=loadCatalog([root]);
  const config:any={permission:global,agent:{'bopen-demo-reviewer':{permission:user}}};
  applyCatalog(config,catalog);
  const p=config.agent['bopen-demo-reviewer'].permission;
  const first=structuredClone(p);applyCatalog(config,catalog);
  expect(config.agent['bopen-demo-reviewer'].permission).toEqual(first);
  return p;
 };
 expect(action(policy('Bash(git:*)','[]',{bash:'allow','*':'deny'}).bash,'git status')).toBe('deny');
 expect(action(policy('Bash(git:*)','[]',{'b?sh':'deny'}).bash,'git status')).toBe('deny');
 const override=policy('Bash(git:*)','[]',{bash:'deny'},{bash:'allow'});
 expect(action(override.bash,'git status')).toBe('allow');
 expect(action(override.bash,'rm file')).toBe('deny');
 const restricted=policy('Bash, Write','Write, Bash(git:*)',{}, {bash:'allow',edit:'allow'});
 expect(action(restricted.bash,'git status')).toBe('deny');
 expect(action(restricted.edit,'file')).toBe('deny');
 expect(action(policy('Skill(core:humanize)','[]',{}).skill,'humanize')).toBe('allow');
 expect(action(policy('Skill(core:*)','[]',{}).skill,'arbitrary')).toBe('deny');
});
