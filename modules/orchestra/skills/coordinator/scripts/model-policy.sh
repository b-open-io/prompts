# Shared model policy for the orchestra dispatch wrappers. Source it, then call
# `bopen_off_policy ID`: it prints why ID is out of policy and returns 0, or returns 1.
# Matches the visual coordinator's isSuperseded: any path segment, any casing.
bopen_off_policy() {
  local id
  id=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  if [[ "$id" =~ (^|/)(claude-)?fable($|[-_.]) ]]; then
    echo "Fable models are never used to coordinate, build, review, or advise"
  elif [[ "$id" =~ (^|/)gpt-5\.5($|-) ]]; then
    echo "GPT-5.5 models are out of policy"
  elif [[ "$id" =~ (^|/)gpt-5\.6($|-) ]]; then
    echo "GPT-5.6 models are out of policy"
  elif [[ "$id" =~ (^|/)grok-4\.6($|-) ]]; then
    echo "Grok 4.6 is out of policy; Grok workers are pinned to grok-4.7"
  else
    return 1
  fi
}
