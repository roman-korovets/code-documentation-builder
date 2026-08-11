#!/usr/bin/env bash
# code-documentation-builder pre-commit hook.
# Verifies that every staged `src/` file change ships with a matching
# `documentation/` edit in the same commit. Refuses to commit otherwise.
#
# Install via: ./hooks/install.sh

set -euo pipefail

# Files staged for commit, relative to repo root.
staged() {
  git diff --cached --name-only --diff-filter=ACMR
}

SRC_STAGED=$(staged | grep -E '^src/.*\.(ts|tsx)$' | grep -Ev '(\.d\.ts|\.test\.|\.spec\.|/__tests__/|/__fixtures__/|/__mocks__/)' || true)
DOCS_STAGED=$(staged | grep -E '^documentation/.*\.md$' || true)

if [[ -z "$SRC_STAGED" ]]; then
  # No source edits staged — nothing to enforce.
  exit 0
fi

if [[ -z "$DOCS_STAGED" ]]; then
  echo "❌ pre-commit: src/ files are staged but no documentation/ changes accompany them." >&2
  echo "   Run /doc-keep-in-sync (or the equivalent CLI: npm run generate && npm run link)" >&2
  echo "   in the plugin repo and re-stage the resulting doc updates, then retry the commit." >&2
  echo "" >&2
  echo "   Staged source files:" >&2
  printf '     %s\n' $SRC_STAGED >&2
  echo "" >&2
  echo "   To bypass intentionally (e.g. pure rename / comment-only edit), commit with --no-verify." >&2
  exit 1
fi

# Soft warning — staged docs may not actually cover the staged sources.
echo "✅ pre-commit: src/ + documentation/ both touched. Auditor will run after commit."
