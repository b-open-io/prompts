#!/usr/bin/env python3
"""HammerTime — Stop hook that catches bad model behaviors via user-defined rules.

Three-layer scored detection:
  Layer 1 (keywords): +1 per keyword hit
  Layer 2 (intent patterns): +2 per regex match on dismissal structure
  Layer 3 (sentence co-occurrence): +3 if dismissal verb + qualifier in same sentence

Score → decision:
  0     → EXIT (no match)
  1-4   → Phase 2 Haiku verification (ambiguous signal)
  5+    → BLOCK directly (skip Haiku, save ~500ms)

Rules come from two sources:
  1. BUILTIN_RULES (hardcoded below)
  2. User rules in ~/.claude/hammertime/rules.json

Stop hook input (from Claude Code):
  - last_assistant_message: the model's final response text
  - stop_hook_active: true if already continuing from a prior Stop hook

Full-turn evaluation (opt-in per rule):
  When a rule has "evaluate_full_turn": true, the hook reads the session
  transcript (~/.claude/projects/{cwd}/*.jsonl) to collect ALL assistant
  messages since the user's last message. This catches violations that
  occur in intermediate responses (between tool calls), not just the
  final message. Falls back to last_assistant_message if transcript
  is unavailable.

Block output format:
  {"decision": "block", "reason": "...", "systemMessage": "..."}
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error

_start_time = time.monotonic()

# --- Sentence splitter (compiled once) ---
SENT_SPLIT = re.compile(r'[.!?\n]+')

# --- Project-owner intent patterns (compiled once at import) ---
# These were tuned against real production logs where Claude deflected errors.
# Each pattern targets a specific deflection structure found in the wild.
_PROJECT_OWNER_INTENT = [
    re.compile(p, re.IGNORECASE) for p in [
        # Attribution deflections: "not caused by us", "not introduced by our changes"
        r"not\s+(?:caused|introduced|created|related|due).*?(?:by|to)\s+(?:us|our|this|these|my)",
        # Pre-dating claims: "appears to predate", "seems to have existed"
        r"(?:appear|seem|look)s?\s+to\s+(?:predate|pre-?date|have\s+existed)",
        # Already-there claims: "already present before", "previously existing when"
        r"(?:already|previously)\s+(?:there|present|existing|existed)\s+(?:before|prior|when)",
        # Scope deflections: "outside the scope", "not within scope"
        r"(?:outside|beyond|not\s+within)\s+(?:the\s+)?scope",
        # Denial: "didn't introduce", "did not cause"
        r"(?:did(?:n.t| not)|don.t|do not)\s+(?:believe\s+)?(?:I\s+)?(?:introduc|caus)",
        # Refusal: "won't fix", "not going to resolve"
        r"(?:won't|will not|cannot|can't|not going to)\s+(?:fix|address|resolve|handle)",
        # Location claims: "present in the codebase before"
        r"(?:present|existing|there)\s+in\s+the\s+(?:codebase|project|repo).*?before",
        # Ticket deflections: "separate issue", "different task"
        r"(?:separate|different|another)\s+(?:issue|task|ticket|PR|pull request)",
        # --- Patterns from real production logs ---
        # "nothing new from my/our changes", "no new ones from our changes"
        r"no(?:thing)?\s+new\s+(?:ones?\s+)?from\s+(?:my|our)\s+changes",
        # "not from our changes", "not from my changes"
        r"not\s+from\s+(?:my|our)\s+changes",
        # "errors are unchanged", "TS errors are unchanged"
        r"(?:errors?|issues?|warnings?|failures?)\s+(?:are|is|remain)\s+unchanged",
        # "match baseline", "matches baseline", "match the baseline"
        r"match(?:es)?\s+(?:the\s+)?baseline",
        # "already failing before our changes", "was already broken before"
        r"already\s+(?:failing|broken|erroring|present)\s+before\s+(?:our|my|this|the)",
        # "unrelated to our work/changes/session"
        r"unrelated\s+to\s+(?:our|my|this)\s+(?:work|changes|session|modifications)",
        # Parenthetical pre-existing labeling: "1 fail (pre-existing", "1 pre-existing fail"
        r"\d+\s+(?:pre-?existing\s+)?(?:fail|error|warning|issue)s?(?:\s*\(pre-?existing)?",
        # Passive cataloguing: "many pre-existing errors", "several pre-existing warnings"
        r"(?:many|several|multiple|numerous|various)\s+pre-?existing\s+(?:TS\s+)?(?:error|warning|issue|failure)s?",
        # Labeling without action: "X issues are pre-existing formatting"
        r"(?:issue|error|warning|lint)s?\s+(?:are|is|were)\s+pre-?existing",
        # Speculative deflection: "might be a pre-existing issue", "could be pre-existing"
        r"(?:might|could|may)\s+be\s+(?:a\s+)?pre-?existing",
    ]
]
_PROJECT_OWNER_DISMISSAL = re.compile(
    r'(?:'
    r'\b(?:dismiss|skip|ignore|leave|defer|punt|unchanged|nothing\s+new)\b|'
    r'\bwon.t\s+fix\b|'
    r'\bmatch(?:es)?\s+baseline\b|'
    r'\bnot\s+(?:going\s+to\s+)?(?:fix|address|resolve)\b|'
    r'\bno\s+need\s+to\s+(?:fix|address)\b|'
    # Passive dismissals — real Claude labels problems and moves on
    r'\bnot\s+from\s+(?:our|my)\s+changes\b|'
    r'\bnot\s+(?:caused|introduced)\s+by\b|'
    r'\bunrelated\s+to\b|'
    r'\bmissing\s+exports?\s+from\b|'  # explains away without fixing
    r'\bno\s+new\s+(?:ones?|errors?)\b'
    r')',
    re.IGNORECASE
)
_PROJECT_OWNER_QUALIFIERS = re.compile(
    r'(?:'
    r'\b(?:pre-?existing|scope|unrelated|legacy)\b|'
    r'\bbefore\s+(?:our|my|this)\b|'
    r'\balready\s+(?:there|present|failing|broken)\b|'
    r'\bfrom\s+(?:our|my)\s+changes\b|'
    r'\bbaseline\b|'
    # Passive qualifier patterns from real logs
    r'\bsibling\s+packages?\b|'  # "missing exports from sibling packages"
    r'\b(?:TS|typescript|type)\s+errors?\b|'  # "pre-existing TS errors"
    r'\bformatting\b'  # "pre-existing formatting"
    r')',
    re.IGNORECASE
)

BUILTIN_RULES = [
    {
        "name": "project-owner",
        "rule": "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing.",
        "enabled": True,
        "keywords": [
            "pre-existing", "preexisting", "pre existing", "predate", "predates",
            "unrelated to our", "existed before", "not introduced by",
            "outside the scope", "nothing to do with our", "not caused by",
            "were already there", "were already present", "already there before",
            "these errors appear to",
            # Real-world patterns from production logs
            "nothing new from", "no new ones from", "not from our changes",
            "not from my changes", "errors are unchanged", "match baseline",
            "matches baseline", "already failing before", "unrelated to my",
            "unrelated to this", "same exact errors",
            # Passive deflection qualifiers — labeling without fixing
            "many pre-existing", "several pre-existing",
            "pre-existing ts error", "pre-existing typescript",
            "pre-existing fail", "pre-existing warning",
            "pre-existing lint", "pre-existing format",
            "appear to predate", "appears to predate", "predate our changes",
            "missing exports from",
        ],
        "intent_patterns": _PROJECT_OWNER_INTENT,
        "dismissal_verbs": _PROJECT_OWNER_DISMISSAL,
        "qualifiers": _PROJECT_OWNER_QUALIFIERS,
        "confidence_threshold": 5,
        "skill": None,
        "builtin": True,
        "evaluate_full_turn": True,
    }
]

USER_RULES_PATH = os.path.expanduser("~/.claude/hammertime/rules.json")
STATE_PATH = os.path.expanduser("~/.claude/hammertime/state.json")


def compile_user_rule(rule):
    """Compile raw pattern strings in a user rule into regex objects.
    Also pre-lowercases keywords for faster scoring."""
    if "intent_patterns" in rule and rule["intent_patterns"]:
        raw = rule["intent_patterns"]
        if isinstance(raw, list) and raw and isinstance(raw[0], str):
            rule["intent_patterns"] = [re.compile(p, re.IGNORECASE) for p in raw]
    if "dismissal_verbs" in rule and isinstance(rule["dismissal_verbs"], str):
        rule["dismissal_verbs"] = re.compile(rule["dismissal_verbs"], re.IGNORECASE)
    if "qualifiers" in rule and isinstance(rule["qualifiers"], str):
        rule["qualifiers"] = re.compile(rule["qualifiers"], re.IGNORECASE)
    if "keywords" in rule:
        rule["keywords"] = [kw.lower() for kw in rule["keywords"]]
    return rule


def load_rules():
    """Load builtin rules + user rules. User rules with same name override builtin."""
    rules = list(BUILTIN_RULES)
    if os.path.exists(USER_RULES_PATH):
        try:
            with open(USER_RULES_PATH, "r") as f:
                user_rules = json.load(f)
            if isinstance(user_rules, list):
                builtin_names = {r["name"] for r in rules}
                for ur in user_rules:
                    ur = compile_user_rule(ur)
                    if ur.get("name") in builtin_names:
                        rules = [r for r in rules if r["name"] != ur["name"]]
                    rules.append(ur)
        except (json.JSONDecodeError, OSError):
            pass
    return [r for r in rules if r.get("enabled", True)]


def load_state():
    """Load iteration tracking state. Returns empty dict if missing or corrupt."""
    if not os.path.exists(STATE_PATH):
        return {}
    try:
        with open(STATE_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state):
    """Atomically write iteration state (temp file + os.rename)."""
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    tmp_path = STATE_PATH + ".tmp"
    try:
        with open(tmp_path, "w") as f:
            json.dump(state, f, indent=2)
        os.rename(tmp_path, STATE_PATH)
    except OSError:
        pass


def score_message(text, rules):
    """Score message against all rules using three-layer detection.

    Returns list of (rule, score, breakdown) tuples where score > 0.
    breakdown is a dict with kw, intent, cluster counts.
    """
    text_lower = text.lower()
    sentences = None  # Lazy-split for Layer 3, cached across rules
    results = []

    for rule in rules:
        kw_count = 0
        intent_count = 0
        cluster_count = 0

        # Layer 1: Keyword hits (+1 each, keywords pre-lowercased at load time)
        for kw in rule.get("keywords", []):
            if kw in text_lower:
                kw_count += 1

        # Layer 2: Intent pattern hits (+2 each)
        intent_patterns = rule.get("intent_patterns", [])
        for pat in intent_patterns:
            if pat.search(text):
                intent_count += 1

        # Layer 3: Sentence co-occurrence (+3)
        dismissal_re = rule.get("dismissal_verbs")
        qualifier_re = rule.get("qualifiers")
        if dismissal_re and qualifier_re:
            if sentences is None:
                sentences = SENT_SPLIT.split(text)
            for sent in sentences:
                if dismissal_re.search(sent) and qualifier_re.search(sent):
                    cluster_count = 1
                    break

        score = kw_count + (intent_count * 2) + (cluster_count * 3)
        if score > 0:
            results.append((rule, score, {"kw": kw_count, "intent": intent_count, "cluster": cluster_count}))

    return results


def phase2_haiku_evaluate(text, rule):
    """Call Haiku to determine if the rule was actually violated. Returns True if violated."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return True

    prompt = (
        "You are a compliance checker for an AI coding assistant.\n\n"
        f"RULE: {rule['rule']}\n\n"
        "ASSISTANT'S RESPONSE:\n"
        f"{text[-4000:]}\n\n"
        "Did the assistant REFUSE TO FIX or DISMISS issues/errors by calling them "
        "pre-existing, out of scope, or not its responsibility? "
        "Merely mentioning the word 'pre-existing' in a factual or explanatory "
        "context is NOT a violation. The violation is specifically REFUSING TO ACT "
        "on problems by attributing them to something else.\n\n"
        "Answer ONLY 'yes' or 'no'."
    )

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 8,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            answer = result.get("content", [{}])[0].get("text", "").strip().lower()
            return answer.startswith("yes")
    except (urllib.error.URLError, OSError, json.JSONDecodeError, KeyError, IndexError):
        return False


def infer_mode(rule_text):
    """Infer whether the rule wants auto-fix or ask-user mode."""
    lower = rule_text.lower()
    fix_signals = ["fix all", "always fix", "fix any", "fix every", "fix these", "fix the"]
    for signal in fix_signals:
        if signal in lower:
            return "fix"
    return "ask"


def build_block_message(rule):
    """Construct the systemMessage from rule text and inferred mode."""
    name = rule["name"]
    text = rule["rule"]
    mode = infer_mode(text)
    skill = rule.get("skill")

    if mode == "fix":
        msg = f"[HammerTime] Rule '{name}' triggered. {text} Fix these issues NOW before stopping."
    else:
        msg = f"[HammerTime] Rule '{name}' triggered. {text} Ask the user whether to fix these issues or skip them."

    if skill:
        msg += f" Invoke Skill({skill}) to address this."

    return msg


def block_and_exit(rule, reason):
    """Print block output JSON and exit. Called when a rule violation is confirmed."""
    # Play alert sound (macOS only, non-blocking, fail silently)
    try:
        subprocess.Popen(
            ["afplay", "/System/Library/Sounds/Sosumi.aiff"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except (FileNotFoundError, OSError):
        pass  # Not macOS or afplay unavailable
    msg = build_block_message(rule)
    output = {"decision": "block", "reason": reason, "systemMessage": msg}
    print(json.dumps(output))
    sys.exit(0)


def debug_log(msg):
    """Write to debug log if HAMMERTIME_DEBUG is set. Includes elapsed ms."""
    debug_path = os.environ.get("HAMMERTIME_DEBUG", "")
    if debug_path:
        elapsed = int((time.monotonic() - _start_time) * 1000)
        try:
            with open(os.path.expanduser(debug_path), "a") as f:
                f.write(f"[{elapsed:>5}ms] {msg}\n")
        except OSError:
            pass


def check_git_clean():
    """Check if git working tree is clean and HEAD matches remote.
    Returns True if there's nothing to commit or push."""
    try:
        # Check for uncommitted changes
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0 or result.stdout.strip():
            return False  # Has uncommitted changes

        # Check for unpushed commits
        result = subprocess.run(
            ["git", "log", "@{u}..HEAD", "--oneline"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0 or result.stdout.strip():
            return False  # Has unpushed commits

        # Check for untracked files (not in .gitignore)
        result = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0 or result.stdout.strip():
            return False  # Has untracked files

        return True  # Everything is clean and pushed
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return False  # Can't determine, assume not clean (safe default)


def find_transcript(cwd=None):
    """Find the most recently modified JSONL transcript for the current project.

    Returns the file path, or None if not found.
    """
    if cwd is None:
        cwd = os.getcwd()

    # CWD → project dir: /Users/satchmo/code/prompts → -Users-satchmo-code-prompts
    mangled = cwd.replace(os.sep, "-")
    if not mangled.startswith("-"):
        mangled = "-" + mangled

    projects_dir = os.path.expanduser(f"~/.claude/projects/{mangled}")
    if not os.path.isdir(projects_dir):
        debug_log(f"TRANSCRIPT: project dir not found: {projects_dir}")
        return None

    # Find most recently modified .jsonl file
    best_path = None
    best_mtime = 0
    try:
        for entry in os.scandir(projects_dir):
            if entry.name.endswith(".jsonl") and entry.is_file():
                mt = entry.stat().st_mtime
                if mt > best_mtime:
                    best_mtime = mt
                    best_path = entry.path
    except OSError:
        debug_log("TRANSCRIPT: failed to scan project dir")
        return None

    if best_path:
        debug_log(f"TRANSCRIPT: found {os.path.basename(best_path)}")
    else:
        debug_log("TRANSCRIPT: no .jsonl files found")

    return best_path


def collect_turn_messages(transcript_path):
    """Read transcript backwards, collect assistant text since last user message.

    Returns concatenated text from all assistant messages in the current turn,
    or None if reading fails.
    """
    try:
        file_size = os.path.getsize(transcript_path)
    except OSError:
        return None

    # Read from the end — we only need the last turn
    MAX_READ = 2 * 1024 * 1024  # 2MB max — safety cap

    try:
        with open(transcript_path, "rb") as f:
            # Seek to near end of file
            start_pos = max(0, file_size - MAX_READ)
            f.seek(start_pos)
            tail = f.read().decode("utf-8", errors="replace")
    except (OSError, UnicodeDecodeError):
        debug_log("TRANSCRIPT: failed to read file")
        return None

    # Parse lines in reverse to find last user message, collect assistant text
    lines = tail.strip().split("\n")
    assistant_texts = []

    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        entry_type = obj.get("type", "")

        # Stop at the last user message — we have the full turn
        if entry_type == "user":
            break

        # Collect assistant text content
        if entry_type == "assistant":
            msg = obj.get("message", {})
            if msg.get("role") != "assistant":
                continue
            content = msg.get("content", "")
            if isinstance(content, str) and content:
                assistant_texts.append(content)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        text = block.get("text", "")
                        if text:
                            assistant_texts.append(text)

    if not assistant_texts:
        debug_log("TRANSCRIPT: no assistant text found in current turn")
        return None

    # Reverse to chronological order, join with newlines
    assistant_texts.reverse()
    full_text = "\n\n".join(assistant_texts)
    debug_log(f"TRANSCRIPT: collected {len(assistant_texts)} assistant blocks, {len(full_text)} chars")
    return full_text


def main():
    debug_log("--- HammerTime run ---")
    try:
        raw = sys.stdin.read()
        hook_input = json.loads(raw)
    except (json.JSONDecodeError, OSError):
        debug_log("EXIT: failed to parse stdin")
        sys.exit(0)

    debug_log(f"INPUT keys: {list(hook_input.keys())}")

    # Don't re-trigger if already in a stop hook continuation
    if hook_input.get("stop_hook_active"):
        debug_log("EXIT: stop_hook_active=true, skipping to avoid loop")
        sys.exit(0)

    last_msg = hook_input.get("last_assistant_message", "")
    if not last_msg:
        debug_log("EXIT: no last_assistant_message")
        sys.exit(0)

    debug_log(f"LAST_MSG length: {len(last_msg)} chars")

    rules = load_rules()
    if not rules:
        debug_log("EXIT: no enabled rules")
        sys.exit(0)

    # Determine session ID from transcript path (resets iteration counters on new session)
    transcript_path = find_transcript()
    session_id = os.path.basename(transcript_path).replace(".jsonl", "") if transcript_path else "unknown"

    # Load iteration state for loop safety (max_iterations)
    state = load_state()
    if state.get("session_id") != session_id:
        debug_log(f"STATE: new session {session_id[:8]}..., resetting iteration counters")
        state = {"session_id": session_id, "rule_iterations": {}}

    # Read transcript for full-turn evaluation if any rule needs it
    full_turn_text = None
    if any(r.get("evaluate_full_turn") for r in rules):
        if transcript_path:
            full_turn_text = collect_turn_messages(transcript_path)

    # Split rules by evaluation mode
    full_turn_rules = []
    last_msg_rules = []
    for rule in rules:
        if rule.get("evaluate_full_turn") and full_turn_text:
            full_turn_rules.append(rule)
        else:
            last_msg_rules.append(rule)

    # Score each group against appropriate text
    scored = []
    if last_msg_rules:
        scored.extend(score_message(last_msg, last_msg_rules))
    if full_turn_rules:
        debug_log(f"FULL_TURN: scoring {len(full_turn_rules)} rules against {len(full_turn_text)} chars")
        scored.extend(score_message(full_turn_text, full_turn_rules))

    debug_log(f"SCORED: {len(scored)} rules with score > 0")
    if not scored:
        sys.exit(0)

    # Evaluate each scored rule
    for rule, score, breakdown in scored:
        threshold = rule.get("confidence_threshold", 5)
        # Use full turn text for full_turn rules, last_msg otherwise
        eval_text = full_turn_text if rule.get("evaluate_full_turn") and full_turn_text else last_msg
        debug_log(f"SCORE: rule '{rule['name']}' score={score} (kw={breakdown['kw']}, intent={breakdown['intent']}, cluster={breakdown['cluster']})")

        # Loop safety: check iteration limit before blocking
        rule_name = rule["name"]
        max_iter = rule.get("max_iterations", 3)
        current_iter = state.get("rule_iterations", {}).get(rule_name, 0)
        if max_iter > 0 and current_iter >= max_iter:
            debug_log(f"SKIP: rule '{rule_name}' hit max iterations ({max_iter}), allowing exit")
            continue

        if score >= threshold:
            # Optional: check git state for rules that care
            if rule.get("check_git_state") and check_git_clean():
                debug_log(f"SKIP: rule '{rule['name']}' score={score} but git state is clean")
                continue
            debug_log(f"BLOCK: score {score} >= {threshold}, skipping Phase 2")
            state.setdefault("rule_iterations", {})[rule_name] = current_iter + 1
            save_state(state)
            block_and_exit(rule, f"HammerTime rule '{rule['name']}' violated (score={score})")
        else:
            if rule.get("check_git_state") and check_git_clean():
                debug_log(f"SKIP: rule '{rule['name']}' score={score}, Haiku phase skipped — git clean")
                continue
            debug_log(f"PHASE2: score {score} < {threshold}, verifying with Haiku")
            violated = phase2_haiku_evaluate(eval_text, rule)
            debug_log(f"PHASE2: rule '{rule['name']}' violated={violated}")
            if violated:
                state.setdefault("rule_iterations", {})[rule_name] = current_iter + 1
                save_state(state)
                block_and_exit(rule, f"HammerTime rule '{rule['name']}' violated (score={score}, haiku=yes)")

    # No violations confirmed
    debug_log("PASS: no violations confirmed")
    sys.exit(0)


if __name__ == "__main__":
    main()
