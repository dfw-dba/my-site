#!/usr/bin/env bash
set -euo pipefail

# Marks all unmarked items in a PR table section as passed.
# Used to auto-mark Pre Deploy Checklist items when deploy-stage runs
# (since it only triggers after CI succeeds).
#
# Usage: pre-deploy-update-checkboxes.sh <pr-number> <section-header>
# Requires: gh CLI authenticated with pull-requests:write

PR_NUMBER="${1:?Usage: pre-deploy-update-checkboxes.sh <pr-number> <section-header>}"
SECTION_HEADER="${2:?Usage: pre-deploy-update-checkboxes.sh <pr-number> <section-header>}"

# Fetch current PR body
PR_BODY=$(gh pr view "$PR_NUMBER" --json body -q '.body')

if [[ -z "$PR_BODY" ]]; then
  echo "Error: Could not fetch PR body for PR #${PR_NUMBER}" >&2
  exit 1
fi

# Check if section exists (use grep -F for literal string matching)
if ! printf '%s' "$PR_BODY" | grep -qF "## ${SECTION_HEADER}"; then
  echo "No '${SECTION_HEADER}' section found in PR #${PR_NUMBER}. Skipping."
  exit 0
fi

# Replace all unmarked table rows (| | | desc |) with passed (| :white_check_mark: | | desc |)
# in the target section only.
# We use awk to scope the replacement to the target section.
UPDATED_BODY=$(printf '%s' "$PR_BODY" | awk -v header="$SECTION_HEADER" '
  BEGIN { in_section = 0 }
  $0 ~ "^## " header "$" { in_section = 1; print; next }
  in_section && /^## / { in_section = 0; print; next }
  in_section && /^\| \| \| .+ \|$/ {
    sub(/^\| \| \| /, "| :white_check_mark: | | ")
    print
    next
  }
  { print }
')

if [[ "$UPDATED_BODY" == "$PR_BODY" ]]; then
  echo "No unmarked items found in '${SECTION_HEADER}'. Nothing to update."
  exit 0
fi

# Use --body-file to avoid shell expansion issues with large content
printf '%s' "$UPDATED_BODY" > /tmp/updated-pr-body.md
gh pr edit "$PR_NUMBER" --body-file /tmp/updated-pr-body.md
echo "PR #${PR_NUMBER} '${SECTION_HEADER}' items marked as passed."
