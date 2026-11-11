# Shared model policy for the orchestra dispatch wrappers. Source it, then call
# `bopen_off_policy ID`: it prints why ID is out of policy and returns 0, or returns 1.
# Matches the visual coordinator's isSuperseded: every path segment, any casing, and any
# non-alphanumeric delimiter after the version (`-mini`, `:free`, `@date`, `.1`).
bopen_off_policy() {
  local id segment
  local -a segments
  id=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  # claude-fable-5-2 is the planning and advisory tier. The exception applies per segment, so a
  # path that also names Fable 5.1 or earlier, the unversioned `fable` alias, or any other Fable
  # id in another segment stays refused.
  IFS=/ read -r -a segments <<< "$id"
  for segment in ${segments[@]+"${segments[@]}"}; do
    if [[ "$segment" =~ ^(claude-)?fable($|[^a-z0-9]) && "$segment" != claude-fable-5-2 ]]; then
      echo "Fable models other than claude-fable-5-2 are out of policy"
      return 0
    fi
  done
  if [[ "$id" =~ (^|/)gpt-5\.5($|[^a-z0-9]) ]]; then
    echo "GPT-5.5 models are out of policy"
  elif [[ "$id" =~ (^|/)gpt-5\.6($|[^a-z0-9]) ]]; then
    echo "GPT-5.6 models are out of policy"
  elif [[ "$id" =~ (^|/)grok-4\.6($|[^a-z0-9]) ]]; then
    echo "Grok 4.6 is out of policy; Grok workers are pinned to grok-4.7"
  else
    return 1
  fi
}
