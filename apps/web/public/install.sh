#!/usr/bin/env bash
set -euo pipefail

if command -v bun >/dev/null 2>&1; then
  BUN_BIN="$(command -v bun)"
elif [ -x "${HOME}/.bun/bin/bun" ]; then
  BUN_BIN="${HOME}/.bun/bin/bun"
else
  echo "TaskWish uses Bun. Installing Bun first..."
  curl -fsSL https://bun.sh/install | bash
  BUN_BIN="${HOME}/.bun/bin/bun"
fi

if [ ! -x "${BUN_BIN}" ]; then
  echo "Bun installation failed. Visit https://bun.sh/docs/installation" >&2
  exit 1
fi

exec "${BUN_BIN}" x @taskwish/create-project "$@"
