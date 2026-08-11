#!/usr/bin/env bash
# code-documentation-builder post-commit hook.
# Runs audit-links.mjs against the documentation/ vault and emits warnings.
# Never blocks — this is informational so the commit still lands.
#
# Install via: ./hooks/install.sh

set -uo pipefail

VAULT="documentation"
AUDIT="${VAULT}/audit-links.mjs"

if [[ ! -f "$AUDIT" ]]; then
  exit 0  # No vault / no audit installed — silently skip.
fi

# Only run when this commit touched something the audit cares about.
TOUCHED=$(git diff-tree --no-commit-id --name-only -r HEAD | grep -E '^(src/|documentation/)' || true)
if [[ -z "$TOUCHED" ]]; then
  exit 0
fi

OUTPUT=$(node "$AUDIT" 2>&1) || true
BROKEN=$(echo "$OUTPUT" | grep -E "Total broken:" | head -n 1 | grep -oE '[0-9]+' || echo "0")

if [[ "$BROKEN" -gt 0 ]]; then
  echo ""
  echo "⚠️  post-commit: audit-links.mjs reports $BROKEN broken wikilink(s) in $VAULT/." >&2
  echo "   The commit landed. Run 'npm run link -- <projectRoot>' to repair, then commit the fix." >&2
  echo "$OUTPUT" | grep -A 20 "C. Broken" >&2
fi
exit 0
