#!/usr/bin/env bash
set -euo pipefail

# Updates PR checkboxes for passed post-deploy validation items.
#
# Usage: post-deploy-update-checkboxes.sh <pr-number> <outcomes-json-file>
# Requires: gh CLI authenticated with pull-requests:write

PR_NUMBER="${1:?Usage: post-deploy-update-checkboxes.sh <pr-number> <outcomes-json-file>}"
OUTCOMES_FILE="${2:?Usage: post-deploy-update-checkboxes.sh <pr-number> <outcomes-json-file>}"

if [[ ! -f "$OUTCOMES_FILE" ]]; then
  echo "Error: Outcomes file not found: $OUTCOMES_FILE" >&2
  exit 1
fi

OUTCOMES=$(cat "$OUTCOMES_FILE")
ITEM_COUNT=$(echo "$OUTCOMES" | jq length)

if [[ "$ITEM_COUNT" -eq 0 ]]; then
  echo "No outcomes to process."
  exit 0
fi

# Fetch current PR body
PR_BODY=$(gh pr view "$PR_NUMBER" --json body -q '.body')

UPDATED_BODY="$PR_BODY"

# For each passed item, replace its checkbox from unchecked to checked
for i in $(seq 0 $((ITEM_COUNT - 1))); do
  PASSED=$(echo "$OUTCOMES" | jq -r ".[$i].passed")
  DESC=$(echo "$OUTCOMES" | jq -r ".[$i].description")

  if [[ "$PASSED" == "true" ]]; then
    # Escape special regex characters in description for sed
    ESCAPED_DESC=$(printf '%s\n' "$DESC" | sed 's/[][\.*^$/]/\\&/g')
    # Replace unchecked checkbox with checked for this item
    UPDATED_BODY=$(echo "$UPDATED_BODY" | sed "s/- \[ \] ${ESCAPED_DESC}/- [x] ${ESCAPED_DESC}/")
    echo "Checked: $DESC"
  else
    echo "Skipped (failed): $DESC"
  fi
done

# Update PR body
gh pr edit "$PR_NUMBER" --body "$UPDATED_BODY"
echo "PR #${PR_NUMBER} checkboxes updated."
