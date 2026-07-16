# Interactive choices — selectable options + copy-response block

When a proposal asks the reviewer to make decisions, don't leave them to type a
reply from scratch. Give the page **selectable option cards** (mutually
exclusive, radio-button semantics, styled as nice boxes with the option's
details inside), **always including one selector on the CEO's final call**
(Agree / Agree with caveats / Disagree, the latter two revealing a text box),
and a **"copy my response" button** that assembles a clean, agent-readable block
— stamped with the proposal's version and link so the agent knows exactly which
iteration was answered.

Drop the CSS once, then one `.vp-decision` block per decision, then the script.
Everything is self-contained and CSP-safe. Style it to match the page's palette
(swap the `--vp-*` fallbacks or map them to your tokens).

## 1. CSS

```html
<style>
  .vp-choices{--vp-line:var(--line,#d9d4c6);--vp-accent:var(--accent,#b8731a);--vp-raise:var(--raise,#fbf8f1);--vp-ink:var(--ink,#211c15);--vp-mut:var(--muted,#8a8172);margin-top:2rem}
  .vp-choices h2{margin:0 0 .3rem}
  .vp-decision{margin:1.4rem 0;padding-top:1.1rem;border-top:1px solid var(--vp-line)}
  .vp-q{font-weight:640;color:var(--vp-ink);margin:0 0 .7rem}
  .vp-opts{display:grid;gap:.6rem}
  .vp-opt{display:flex;gap:.75rem;align-items:flex-start;padding:.85rem 1rem;border:1.5px solid var(--vp-line);border-radius:11px;background:var(--vp-raise);cursor:pointer;transition:border-color .12s,box-shadow .12s}
  .vp-opt:hover{border-color:color-mix(in srgb,var(--vp-accent) 45%,var(--vp-line))}
  .vp-opt:focus-within{outline:2px solid var(--vp-accent);outline-offset:2px}
  .vp-opt input{appearance:none;-webkit-appearance:none;margin:.15rem 0 0;width:1.15rem;height:1.15rem;flex:0 0 auto;border:2px solid var(--vp-mut);border-radius:50%;cursor:pointer}
  .vp-opt input:checked{border-color:var(--vp-accent);background:radial-gradient(circle at center,var(--vp-accent) 0 45%,transparent 48%)}
  .vp-opt:has(input:checked){border-color:var(--vp-accent);box-shadow:0 0 0 1px var(--vp-accent) inset}
  .vp-opt-b{display:flex;flex-direction:column;gap:.15rem}
  .vp-opt-b b{color:var(--vp-ink)}
  .vp-opt-b span{font-size:.9rem;color:var(--vp-mut);line-height:1.45}
  .vp-note{display:none;width:100%;margin-top:.6rem;min-height:4.5rem;padding:.6rem .7rem;border:1.5px solid var(--vp-line);border-radius:9px;background:var(--vp-raise);color:var(--vp-ink);font:inherit;resize:vertical}
  .vp-note.show{display:block}
  .vp-actions{display:flex;align-items:center;gap:.9rem;margin-top:1.6rem}
  .vp-copy{font:inherit;font-weight:620;padding:.7rem 1.15rem;border-radius:10px;border:0;background:var(--vp-accent);color:#fff;cursor:pointer}
  .vp-copy:active{transform:translateY(1px)}
  .vp-toast{font-size:.85rem;color:var(--vp-accent);opacity:0;transition:opacity .15s}
  .vp-toast.show{opacity:1}
</style>
```

## 2. Markup — one `.vp-decision` per decision (the CEO one is required)

Set `data-q` to the decision's short question; each option's radio `value` is
what gets copied. Options in one decision share a `name`. Add `data-note` to any
option that should reveal the free-text box.

```html
<section class="vp-choices" data-proposal-title="Referenced-content collections" data-proposal-version="round-2 · v3">
  <h2>Your call</h2>

  <div class="vp-decision" data-q="Item encoding">
    <p class="vp-q">Which item form do we ship?</p>
    <div class="vp-opts">
      <label class="vp-opt"><input type="radio" name="d-encoding" value="ord-fs/json (. default entry)">
        <span class="vp-opt-b"><b>ord-fs/json directory</b><span>Self-describing; `.` default-entry; fails safe. The bench's pick.</span></span></label>
      <label class="vp-opt"><input type="radio" name="d-encoding" value="BSV-21 token member">
        <span class="vp-opt-b"><b>BSV-21 token member</b><span>Fungible/tradeable members; a token balance, not an NFT tile.</span></span></label>
    </div>
  </div>

  <!-- REQUIRED: the CEO's final call -->
  <div class="vp-decision" data-q="CEO's final call — Chief recommends ord-fs/json now, token members as a fast-follow">
    <p class="vp-q">On Chief's final decision:</p>
    <div class="vp-opts">
      <label class="vp-opt"><input type="radio" name="d-ceo" value="Agree">
        <span class="vp-opt-b"><b>Agree</b><span>Go with Chief's call as stated.</span></span></label>
      <label class="vp-opt"><input type="radio" name="d-ceo" value="Agree with caveats" data-note>
        <span class="vp-opt-b"><b>Agree with caveats</b><span>Mostly yes — with the conditions I note below.</span></span></label>
      <label class="vp-opt"><input type="radio" name="d-ceo" value="Disagree" data-note>
        <span class="vp-opt-b"><b>Disagree</b><span>Take a different path — I'll say why below.</span></span></label>
    </div>
    <textarea class="vp-note" data-for="d-ceo" placeholder="What exactly do you disagree with, or the caveats you're attaching…"></textarea>
  </div>

  <div class="vp-actions">
    <button type="button" class="vp-copy">Copy my response for the agent</button>
    <span class="vp-toast" role="status">Copied ✓</span>
  </div>
</section>
```

## 3. Script (paste once, after the markup)

Reveals note boxes on demand and builds the copy payload. It stamps the block
with the title/version from `data-proposal-*` and the current page URL, so the
agent knows which iteration you answered.

```html
<script>
(function(){
  var root=document.querySelector('.vp-choices'); if(!root) return;
  // reveal free-text when a data-note option is picked
  root.querySelectorAll('input[type=radio]').forEach(function(r){
    r.addEventListener('change',function(){
      var note=root.querySelector('.vp-note[data-for="'+r.name+'"]');
      if(note) note.classList.toggle('show', !!root.querySelector('input[name="'+r.name+'"][data-note]:checked'));
    });
  });
  function build(){
    var title=root.getAttribute('data-proposal-title')||document.title||'this proposal';
    var version=root.getAttribute('data-proposal-version')||'';
    var url=location.href;
    var lines=['=== PROPOSAL RESPONSE ===',
      'These are my selections on the proposal "'+title+'"'+(version?(' ('+version+')'):'')+'.',
      'Proposal: '+url,'','Decisions:'];
    root.querySelectorAll('.vp-decision').forEach(function(d){
      var q=d.getAttribute('data-q')||'(decision)';
      var picked=d.querySelector('input:checked');
      lines.push('- '+q+': '+(picked?picked.value:'(no selection)'));
      var note=d.querySelector('.vp-note.show');
      if(note && note.value.trim()) lines.push('    note: '+note.value.trim().replace(/\n/g,' '));
    });
    lines.push('','(Agent: apply these as my direction on this exact proposal iteration. If a decision says "(no selection)", ask me before proceeding on it.)');
    return lines.join('\n');
  }
  root.querySelector('.vp-copy').addEventListener('click',function(){
    var text=build(), toast=root.querySelector('.vp-toast');
    var done=function(){toast.classList.add('show');setTimeout(function(){toast.classList.remove('show')},1600)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,fallback)}else{fallback()}
    function fallback(){var t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove();done()}
  });
})();
</script>
```

## Notes

- **Version/link stamp.** Set `data-proposal-version` to whatever label matches
  the artifact's version (e.g. "round-2 · v3"). `location.href` supplies the link
  automatically once published, so the agent can tie the response to the exact
  iteration. Keep the version label in sync when you republish.
- **The CEO selector is mandatory** whenever the page has a CEO final call —
  Agree / Agree-with-caveats / Disagree, the last two revealing the note box.
- **No selection ≠ silent default.** The copy block marks unselected decisions
  `(no selection)` and tells the agent to ask, so nothing is assumed.
- Radio `name`s give real mutual exclusion; `:has(input:checked)` styles the
  selected card, with the checked radio dot as a fallback affordance.
