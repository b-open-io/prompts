# Interactive choices — decisions, consequences, and a copyable response

Inventory every unresolved choice that changes scope, behavior, architecture,
rollout, risk, or follow-up work. Give each one a fieldset in **Your call**,
including the CEO's final call when awaiting the reviewer's decision. Do not leave blocking decisions
only in prose. Give each question **2–4 substantive options plus Unsure**, with
no preselection, recommended badges, or unequal visual weight.

Each substantive option explains what changes, what it enables, its cost or
risk, reversibility, and follow-up in 2–4 short sentences. **Unsure** names the
specific check the agent will perform next and what remains undecided. It never
means accepting the CEO's call or silently selecting a default. Keep choices
consistent with the decision tree: unresolved upstream choices hold dependent
work; unaffected checks can continue. For conditional questions, mark an inactive
answer `not applicable — [upstream reason]` in the visible and copied response;
do not transmit a stale hidden selection. Adapt the response spans, CSS rules,
and script to those actual dependencies. If answers conflict (for example,
choosing all users while agreeing to a pilot), flag the conflict in the response
and ask the reviewer to resolve it before dependent work. Do not silently
override either answer. The template below needs these
explicit additions when used for a conditional decision tree. It includes one
example conflict check; replace that check with the proposal’s real conflicts.

Use the page's shared BitPlan tokens (`bg`, `fg`, `muted`, `line`, `card`,
`accent`, `soft`), restrained borders, native radios, and stacked cards. The
example below is generic; replace every question, consequence, next check, and
proposal stamp with the proposal's actual content. The CEO options remain
**Agree / Agree with caveats / Disagree / Unsure**.

The visible response works with scripts disabled using CSS `:has()`. JavaScript
only enhances the response with typed notes and clipboard support. Notes stay
available without scripts; the manual-copy instructions explicitly tell the
reviewer to append them. No network request, storage, or submission is needed.

## 1. CSS

Load the shared page token and theme baseline from
[design-system.md](design-system.md) once per document. This component inherits
those tokens and does not override the page’s theme selection.

```html
<style>
  .vp-choices { color:var(--fg); margin-top:3rem; line-height:1.6; }
  .vp-decision { min-inline-size:0; margin:1.4rem 0; padding:16px 18px; border:1px solid var(--line); border-radius:10px; background:var(--card); }
  .vp-decision legend { padding:0 .3rem; font-weight:700; }
  .vp-why, .vp-hint { color:var(--muted); font-size:.88rem; }
  .vp-why { margin:0 0 .6rem; }
  .vp-opt { display:grid; grid-template-columns:1.4rem 1fr; gap:8px; align-items:start; padding:10px; border:1px solid var(--line); border-radius:8px; margin:6px 0; cursor:pointer; }
  .vp-opt input { margin-top:.3rem; accent-color:var(--accent); }
  .vp-opt b, .vp-opt small { display:block; }
  .vp-opt small { color:var(--muted); font-size:.88rem; }
  .vp-opt:has(input:checked) { border-color:var(--accent); background:var(--soft); }
  .vp-opt:focus-within, .vp-note:focus-visible, .vp-copy:focus-visible, .vp-output:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
  .vp-note-label { display:block; margin-top:1rem; }
  .vp-note { display:block; width:100%; box-sizing:border-box; min-height:80px; margin-top:8px; padding:10px; border:1px solid var(--line); border-radius:8px; background:var(--bg); color:var(--fg); font:inherit; resize:vertical; }
  .vp-actions { margin-top:1.5rem; }
  .vp-copy { padding:10px 16px; border:1px solid var(--accent); border-radius:8px; background:var(--soft); color:var(--fg); font:inherit; font-weight:700; cursor:pointer; }
  .vp-copy[hidden] { display:none; }
  .vp-output { padding:14px 16px; border:1px solid var(--line); border-radius:8px; background:var(--soft); white-space:pre-wrap; overflow-wrap:anywhere; user-select:all; -webkit-user-select:all; font-size:.92rem; }
  .vp-answer, .vp-conflict { display:none; }
  .vp-choices:has(#vp-rollout-all:checked):has(#vp-ceo-agree:checked) .vp-conflict { display:block; }
  /* Add one answer rule per radio and one empty-state rule per question. */
  .vp-choices:has(#vp-rollout-pilot:checked) .vp-answer-pilot,
  .vp-choices:has(#vp-rollout-all:checked) .vp-answer-all,
  .vp-choices:has(#vp-rollout-unsure:checked) .vp-answer-rollout-unsure,
  .vp-choices:has(#vp-ceo-agree:checked) .vp-answer-agree,
  .vp-choices:has(#vp-ceo-caveats:checked) .vp-answer-caveats,
  .vp-choices:has(#vp-ceo-disagree:checked) .vp-answer-disagree,
  .vp-choices:has(#vp-ceo-unsure:checked) .vp-answer-ceo-unsure { display:inline; }
  .vp-choices:has(input[name="vp-rollout"]:checked) .vp-empty-rollout,
  .vp-choices:has(input[name="vp-ceo"]:checked) .vp-empty-ceo { display:none; }
</style>
```

## 2. Markup

Each radio needs a unique `id`, a shared `name` within its fieldset, and a
meaningful `value`. Match each value to a response span and its CSS rule. Keep
notes permanently visible with explicit labels; caveats and disagreements must
not depend on JavaScript to explain them. When copying this pattern for more
questions, update the fieldsets, response lines, and CSS together.

Stamp the title, version, and origin visibly and in `data-proposal-*`. Origin
must be an explicitly supplied **public proposal ID, public origin outpoint, or
safe public permalink**, or `unpublished`. Never derive it from the browser URL:
reader URLs can contain private decryption fragments, tokens, or local paths.
Do not copy private reader links into the response.

```html
<section class="vp-choices" aria-labelledby="vp-heading"
  data-proposal-title="Staged rollout" data-proposal-version="draft 2"
  data-proposal-origin="unpublished">
  <h2 id="vp-heading">Your call</h2>
  <p>Pick one answer per question. Unsure requests the stated check and leaves that decision open.</p>

  <fieldset class="vp-decision" data-q="Rollout scope">
    <legend>1. Who gets the first release?</legend>
    <p class="vp-why">Scope determines how many users encounter an undiscovered failure.</p>
    <label class="vp-opt"><input type="radio" name="vp-rollout" id="vp-rollout-pilot" value="Pilot group">
      <span><b>Pilot group</b><small>Release to a small invited group so feedback arrives before broad exposure. Recruitment takes time and may miss uncommon workflows. Expand after the pilot checks pass, or disable access if they fail.</small></span></label>
    <label class="vp-opt"><input type="radio" name="vp-rollout" id="vp-rollout-all" value="All users">
      <span><b>All users</b><small>Release to everyone so all users can benefit immediately. An undiscovered failure affects the full audience. Disable access if needed; review support reports before the next release.</small></span></label>
    <label class="vp-opt"><input type="radio" name="vp-rollout" id="vp-rollout-unsure" value="Unsure — check pilot recruitment capacity before deciding">
      <span><b>Unsure</b><small>The agent will check pilot recruitment capacity and report whether the group covers the main workflows. This delays the scope decision; neither release path is accepted.</small></span></label>
    <label class="vp-note-label" for="vp-rollout-note">Rollout notes (optional)</label>
    <textarea class="vp-note" id="vp-rollout-note" placeholder="Constraints or questions about rollout"></textarea>
  </fieldset>

  <!-- Required when the CEO's final call awaits the reviewer's decision. -->
  <fieldset class="vp-decision" data-q="CEO's final call: run a pilot before broad release">
    <legend>2. On the CEO's final call</legend>
    <p class="vp-why">Chief calls for a pilot before broad release. Your answer directs the next iteration.</p>
    <label class="vp-opt"><input type="radio" name="vp-ceo" id="vp-ceo-agree" value="Agree">
      <span><b>Agree</b><small>Adopt the pilot direction, subject to the proposal's stated scope and unresolved dependencies. Broad availability waits for pilot evidence. The direction can change after reviewing that evidence.</small></span></label>
    <label class="vp-opt"><input type="radio" name="vp-ceo" id="vp-ceo-caveats" value="Agree with caveats — resolve my conditions before proceeding">
      <span><b>Agree with caveats</b><small>Keep the pilot direction with the conditions you write below. The agent resolves those conditions before dependent work starts, which may change cost or timing. You can revise the conditions after the response.</small></span></label>
    <label class="vp-opt"><input type="radio" name="vp-ceo" id="vp-ceo-disagree" value="Disagree — revise the proposal using my reasons">
      <span><b>Disagree</b><small>Reopen the direction using your reasons below and request a revised proposal. Dependent implementation waits, adding another review cycle. You can choose a direction after reviewing the revision.</small></span></label>
    <label class="vp-opt"><input type="radio" name="vp-ceo" id="vp-ceo-unsure" value="Unsure — check rollback readiness and pilot coverage before revisiting the CEO call">
      <span><b>Unsure</b><small>The agent will check rollback readiness and pilot coverage, then revisit Chief's call with that evidence. The call remains undecided while the check runs; this does not accept it.</small></span></label>
    <label class="vp-note-label" for="vp-ceo-note">CEO response notes</label>
    <p class="vp-hint">For caveats or disagreement, explain your conditions or reasons. If omitted, the agent must ask before acting on this call.</p>
    <textarea class="vp-note" id="vp-ceo-note" placeholder="Conditions, reasons, or missing evidence"></textarea>
  </fieldset>

  <label class="vp-note-label" for="vp-general-note">Anything else (optional)</label>
  <textarea class="vp-note" id="vp-general-note" placeholder="Other constraints, questions, or changes"></textarea>

  <div class="vp-actions">
    <button type="button" class="vp-copy" hidden>Copy my response for the agent</button>
    <p class="vp-hint vp-copy-hint">Select the block below and copy it. Append any typed notes manually; scripts are needed to include them automatically.</p>
    <p class="vp-hint vp-status" role="status" aria-live="polite"></p>
    <pre class="vp-output" tabindex="0" aria-label="Proposal response">=== PROPOSAL RESPONSE ===
Proposal: Staged rollout (draft 2)
Origin: unpublished
1. Rollout scope: <span class="vp-empty-rollout">(no selection)</span><span class="vp-answer vp-answer-pilot">Pilot group</span><span class="vp-answer vp-answer-all">All users</span><span class="vp-answer vp-answer-rollout-unsure">Unsure — check pilot recruitment capacity before deciding</span>
2. CEO's final call: run a pilot before broad release: <span class="vp-empty-ceo">(no selection)</span><span class="vp-answer vp-answer-agree">Agree</span><span class="vp-answer vp-answer-caveats">Agree with caveats — resolve my conditions before proceeding</span><span class="vp-answer vp-answer-disagree">Disagree — revise the proposal using my reasons</span><span class="vp-answer vp-answer-ceo-unsure">Unsure — check rollback readiness and pilot coverage before revisiting the CEO call</span>
<span class="vp-conflict">Conflict: All users conflicts with agreeing to the pilot call. Resolve rollout scope before dependent work.</span>
Agent: Unsure requests its stated check; it does not accept an option. Ask about unselected decisions, conflicting answers, or missing caveats/reasons before dependent work. These answers do not authorize actions beyond the stated scope.</pre>
  </div>
</section>
```

## 3. Optional script (paste once, after the markup)

The script builds the same response from the controls and includes all typed
notes, even after a changed selection. It updates the visible block on input and
before copying. A failed clipboard attempt selects that complete block, including
notes, and says to copy manually. Report success only after the clipboard API
resolves or `execCommand('copy')` returns true. If inline scripts are blocked by
the host's CSP, the static response above remains usable.

```html
<script>
(function () {
  document.querySelectorAll('.vp-choices').forEach(function (root) {
    var out = root.querySelector('.vp-output');
    var btn = root.querySelector('.vp-copy');
    var status = root.querySelector('.vp-status');
    var hint = root.querySelector('.vp-copy-hint');
    if (!out || !btn || !status || !hint) return;
    var instruction = 'Agent: Unsure requests its stated check; it does not accept an option. Ask about unselected decisions, conflicting answers, or missing caveats/reasons before dependent work. These answers do not authorize actions beyond the stated scope.';
    function build() {
      var lines = ['=== PROPOSAL RESPONSE ===',
        'Proposal: ' + root.dataset.proposalTitle + ' (' + root.dataset.proposalVersion + ')',
        'Origin: ' + (root.dataset.proposalOrigin || 'unpublished')];
      root.querySelectorAll('.vp-decision').forEach(function (decision, index) {
        var chosen = decision.querySelector('input[type="radio"]:checked');
        lines.push((index + 1) + '. ' + decision.dataset.q + ': ' + (chosen ? chosen.value : '(no selection)'));
        var note = decision.querySelector('.vp-note');
        if (note && note.value.trim()) lines.push('Notes: ' + note.value.trim());
      });
      var general = root.querySelector('#vp-general-note');
      if (general && general.value.trim()) lines.push('General notes: ' + general.value.trim());
      if (root.querySelector('#vp-rollout-all:checked') && root.querySelector('#vp-ceo-agree:checked')) {
        lines.push('Conflict: All users conflicts with agreeing to the pilot call. Resolve rollout scope before dependent work.');
      }
      lines.push('', instruction);
      return lines.join('\n');
    }
    function update() { out.textContent = build(); }
    function legacyCopy(value) {
      var field = document.createElement('textarea');
      field.value = value;
      field.readOnly = true;
      field.style.position = 'fixed';
      field.style.top = '-1000px';
      document.body.appendChild(field);
      field.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      field.remove();
      btn.focus();
      return copied;
    }
    function fallback(value) {
      if (legacyCopy(value)) { status.textContent = 'Copied.'; return; }
      out.focus();
      var range = document.createRange();
      range.selectNodeContents(out);
      var selection = window.getSelection();
      if (selection) { selection.removeAllRanges(); selection.addRange(range); }
      status.textContent = 'Clipboard unavailable. Copy the response block manually with Ctrl+C or Cmd+C; it includes your notes.';
    }
    root.addEventListener('input', function () { update(); status.textContent = ''; });
    root.addEventListener('change', update);
    btn.addEventListener('click', function () {
      update();
      var value = out.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText(value).then(function () {
            status.textContent = 'Copied.';
          }, function () { fallback(value); });
        } catch (error) { fallback(value); }
      } else { fallback(value); }
    });
    update();
    hint.textContent = 'Copy the response below or use the button. All typed notes are included.';
    btn.hidden = false;
  });
})();
</script>
```

## Validation before delivery

- Match every decision-tree branch requiring reviewer input to a fieldset.
  Each has 2–4 substantive choices plus Unsure and no preselected answer.
- With scripts disabled, select every option once: exactly its response appears,
  the no-selection placeholder disappears, and notes remain available to edit.
  CSS cannot mirror textarea values; manual copying must include appended notes.
- With scripts enabled, exercise keyboard selection, multiline decision notes,
  general notes, and changed selections. The visible and copied response must
  retain all notes and the correct title, version, and public origin.
- Deny clipboard access and force the legacy copy to fail: the manual fallback
  must contain the full response and must not claim it copied successfully.
- Keep the visible stamp and data attributes synchronized on every revision.
  Do not read the current URL or include a private reader token or local path.
