#!/usr/bin/env bash
# Install code-documentation-builder git hooks into the host project.
# Run from the host project root, with the plugin available locally.
#
# Usage:
#   ./path/to/code-documentation-builder/hooks/install.sh [--force]

set -euo pipefail

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: install.sh [--force]" >&2
      exit 2
      ;;
  esac
done

HOOK_DIR=$(git rev-parse --git-path hooks)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

install_one() {
  local name="$1"
  local src="${SCRIPT_DIR}/${name}.sh"
  local dst="${HOOK_DIR}/${name}"
  if [[ ! -f "$src" ]]; then
    echo "❌ missing $src" >&2
    exit 1
  fi
  if [[ -f "$dst" && $FORCE -eq 0 ]]; then
    echo "⚠️  $dst already exists. Re-run with --force to overwrite." >&2
    return
  fi
  cp "$src" "$dst"
  chmod +x "$dst"
  echo "✅ installed $name → $dst"
}

install_one pre-commit
install_one post-commit

echo ""
echo "Hooks installed. They will run on every commit. To disable temporarily, use git commit --no-verify."
