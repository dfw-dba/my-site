#!/usr/bin/env bash
set -euo pipefail

# Reads a PR body from a file, extracts post-deploy validation items,
# executes each bash command block, and writes results.
#
# Usage: post-deploy-validate.sh <pr-body-file>
# Env: API_URL, DOMAIN_NAME (injected by workflow)
#
# Outputs:
#   /tmp/validation-results.md   - markdown comment body
#   /tmp/validation-outcomes.json - JSON array of {description, passed}

PR_BODY_FILE="${1:?Usage: post-deploy-validate.sh <pr-body-file>}"

if [[ ! -f "$PR_BODY_FILE" ]]; then
  echo "Error: PR body file not found: $PR_BODY_FILE" >&2
  exit 1
fi

# Extract the post-deploy validation section (from header to next ## or EOF)
POST_DEPLOY_SECTION=$(awk '
  /^## [Pp]ost-deploy [Vv]alidation/ { found=1; next }
  found && /^## / { exit }
  found { print }
' "$PR_BODY_FILE")

if [[ -z "$POST_DEPLOY_SECTION" ]]; then
  echo "No post-deploy validation section found in PR body."
  echo "[]" > /tmp/validation-outcomes.json
  echo "No post-deploy validation items found." > /tmp/validation-results.md
  exit 0
fi

# Parse items: each starts with "- [ ]" and may contain a ```bash block
RESULTS_MD=""
OUTCOMES_JSON="[]"
ITEM_INDEX=0
TOTAL_PASS=0
TOTAL_FAIL=0

# Read items line by line, collecting description + command
CURRENT_DESC=""
CURRENT_CMD=""
IN_BASH_BLOCK=false

process_item() {
  local desc="$1"
  local cmd="$2"
  local index="$3"

  if [[ -z "$cmd" ]]; then
    echo "  Skipping item (no bash block): $desc"
    return
  fi

  echo "  Running validation $((index + 1)): $desc"

  local output
  local exit_code
  output=$(timeout 30 bash -c "$cmd" 2>&1) && exit_code=0 || exit_code=$?

  local status_icon
  if [[ $exit_code -eq 0 ]]; then
    status_icon="PASS"
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    status_icon="FAIL"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi

  # Truncate long output
  if [[ ${#output} -gt 1000 ]]; then
    output="${output:0:1000}... (truncated)"
  fi

  RESULTS_MD="${RESULTS_MD}
### ${status_icon}: ${desc}

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"

  OUTCOMES_JSON=$(echo "$OUTCOMES_JSON" | jq \
    --arg desc "$desc" \
    --argjson passed "$([ $exit_code -eq 0 ] && echo true || echo false)" \
    '. + [{"description": $desc, "passed": $passed}]')
}

while IFS= read -r line; do
  # Detect start of a new checkbox item
  if [[ "$line" =~ ^[[:space:]]*-[[:space:]]\[[[:space:]]\][[:space:]]+(.*) ]]; then
    # Process previous item if exists
    if [[ -n "$CURRENT_DESC" ]]; then
      process_item "$CURRENT_DESC" "$CURRENT_CMD" "$ITEM_INDEX"
      ITEM_INDEX=$((ITEM_INDEX + 1))
    fi
    CURRENT_DESC="${BASH_REMATCH[1]}"
    CURRENT_CMD=""
    IN_BASH_BLOCK=false
    continue
  fi

  # Detect bash code fence (may be indented inside list item)
  if [[ "$line" =~ ^[[:space:]]*\`\`\`bash[[:space:]]*$ ]] && [[ -n "$CURRENT_DESC" ]]; then
    IN_BASH_BLOCK=true
    CURRENT_CMD=""
    continue
  fi

  # Detect end of code fence (may be indented inside list item)
  if [[ "$line" =~ ^[[:space:]]*\`\`\`[[:space:]]*$ ]] && $IN_BASH_BLOCK; then
    IN_BASH_BLOCK=false
    continue
  fi

  # Collect command lines
  if $IN_BASH_BLOCK; then
    if [[ -n "$CURRENT_CMD" ]]; then
      CURRENT_CMD="${CURRENT_CMD}
${line}"
    else
      CURRENT_CMD="$line"
    fi
  fi
done <<< "$POST_DEPLOY_SECTION"

# Process last item
if [[ -n "$CURRENT_DESC" ]]; then
  process_item "$CURRENT_DESC" "$CURRENT_CMD" "$ITEM_INDEX"
fi

# Write results
HEADER="## Post-Deploy Validation Results

**${TOTAL_PASS} passed, ${TOTAL_FAIL} failed** out of $((TOTAL_PASS + TOTAL_FAIL)) items.
"

echo "${HEADER}${RESULTS_MD}" > /tmp/validation-results.md
echo "$OUTCOMES_JSON" > /tmp/validation-outcomes.json

echo ""
echo "Results: ${TOTAL_PASS} passed, ${TOTAL_FAIL} failed"

if [[ $TOTAL_FAIL -gt 0 ]]; then
  exit 1
fi
