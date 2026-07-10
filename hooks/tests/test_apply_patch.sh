#!/bin/bash
# Codex apply_patch Add/Update/Delete protected path policy.

echo
echo "--- apply_patch path policy ---"

make_patch_input() {
  local patch="$1"
  jq -n --arg p "$patch" '{tool_name:"apply_patch", tool_input:{input:$p}}'
}

# Add to zero-access path → deny
patch=$'*** Begin Patch\n*** Add File: .env\n+SECRET=1\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Add .env blocked" "2" "$HOOK_EXIT"
assert_contains "apply_patch Add .env reason" "zero-access" "$HOOK_STDERR"

# Update read-only path → deny
patch=$'*** Begin Patch\n*** Update File: package-lock.json\n@@\n-a\n+b\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Update package-lock blocked" "2" "$HOOK_EXIT"
assert_contains "apply_patch Update lock reason" "read-only" "$HOOK_STDERR"

# Delete no-delete path → deny
patch=$'*** Begin Patch\n*** Delete File: README.md\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Delete README blocked" "2" "$HOOK_EXIT"
assert_contains "apply_patch Delete README reason" "no-delete" "$HOOK_STDERR"

# Innocent add allowed
patch=$'*** Begin Patch\n*** Add File: src/hello.ts\n+export const hi = 1\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Add src/hello allowed" "0" "$HOOK_EXIT"

# Update allowed path
patch=$'*** Begin Patch\n*** Update File: src/hello.ts\n@@\n-export const hi = 1\n+export const hi = 2\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Update src/hello allowed" "0" "$HOOK_EXIT"

# Delete allowed path
patch=$'*** Begin Patch\n*** Delete File: src/tmp.ts\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Delete src/tmp allowed" "0" "$HOOK_EXIT"

# .env.example exception via Add
patch=$'*** Begin Patch\n*** Add File: .env.example\n+FOO=\n*** End Patch'
run_hook "damage-control.sh" "codex" "$(make_patch_input "$patch")"
assert_exit "apply_patch Add .env.example allowed" "0" "$HOOK_EXIT"
