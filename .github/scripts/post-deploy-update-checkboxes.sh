#!/usr/bin/env bash
set -euo pipefail

# Updates PR table checkboxes for post-deploy validation items.
# Marks passed items with :white_check_mark: in the Passed column
# and failed items with :x: in the Failed column.
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

# For each item, update the table row with pass/fail indicator
for i in $(seq 0 $((ITEM_COUNT - 1))); do
  PASSED=$(echo "$OUTCOMES" | jq -r ".[$i].passed")
  DESC=$(echo "$OUTCOMES" | jq -r ".[$i].description")

  # Escape special regex characters in description for sed (including / delimiter)
  ESCAPED_DESC=$(printf '%s\n' "$DESC" | sed 's/[]\\/.*^$[]/\\&/g')

  if [[ "$PASSED" == "true" ]]; then
    # Replace unmarked row with passed indicator
    UPDATED_BODY=$(printf '%s' "$UPDATED_BODY" | sed "s/| | | ${ESCAPED_DESC} |/| :white_check_mark: | | ${ESCAPED_DESC} |/")
    echo "Passed: $DESC"
  else
    # Replace unmarked row with failed indicator
    UPDATED_BODY=$(printf '%s' "$UPDATED_BODY" | sed "s/| | | ${ESCAPED_DESC} |/| | :x: | ${ESCAPED_DESC} |/")
    echo "Failed: $DESC"
  fi
done

# Update PR body using --body-file to avoid shell expansion issues with large content
printf '%s' "$UPDATED_BODY" > /tmp/updated-pr-body.md
gh pr edit "$PR_NUMBER" --body-file /tmp/updated-pr-body.md
echo "PR #${PR_NUMBER} table checkboxes updated."
