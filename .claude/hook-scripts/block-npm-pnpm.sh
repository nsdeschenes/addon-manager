#!/usr/bin/env bash
# Pre-tool hook: block npm and pnpm, suggest bun

input=$(cat)
command=$(echo "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('command', ''))" 2>/dev/null)

if echo "$command" | grep -qE '(^|[[:space:]&|;`])(npm|pnpm)([[:space:]]|$)'; then
  echo "Use 'bun' instead of npm/pnpm. This project uses bun as its package manager." >&2
  exit 2
fi
