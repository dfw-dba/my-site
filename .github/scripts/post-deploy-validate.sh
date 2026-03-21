#!/usr/bin/env bash
set -euo pipefail

# Reads a PR body from a file, extracts post-deploy validation items from a
# table format with HTML comment anchors, executes each bash command block,
# and writes results.
#
# Usage: post-deploy-validate.sh <pr-body-file> [section-header]
# Env: API_URL, DOMAIN_NAME (injected by workflow)
#
# Arguments:
#   pr-body-file   - path to the file containing the PR body markdown
#   section-header - (optional) the ## header name to look for (default: "Prod-Post-deploy validation")
#
# Expected PR body format:
#   ## Section Header
#
#   | Passed | Failed | Item |
#   |--------|--------|------|
#   | | | Some manual item |
#   | | | Some automated item |
#
#   <!-- validate: Some automated item -->
#   ```bash
#   curl -sf "${API_URL}/api/health"
#   ```
#
# Outputs:
#   /tmp/validation-results.md   - markdown comment body
#   /tmp/validation-outcomes.json - JSON array of {description, passed}

PR_BODY_FILE="${1:?Usage: post-deploy-validate.sh <pr-body-file> [section-header]}"
SECTION_HEADER="${2:-Prod-Post-deploy validation}"

if [[ ! -f "$PR_BODY_FILE" ]]; then
  echo "Error: PR body file not found: $PR_BODY_FILE" >&2
  exit 1
fi

# Extract the validation section (from header to next ## or EOF)
SECTION=$(awk -v header="$SECTION_HEADER" '
  $0 ~ "^## " header { found=1; next }
  found && /^## / { exit }
  found { print }
' "$PR_BODY_FILE")

if [[ -z "$SECTION" ]]; then
  echo "No '${SECTION_HEADER}' section found in PR body."
  echo "[]" > /tmp/validation-outcomes.json
  echo "No post-deploy validation items found." > /tmp/validation-results.md
  exit 0
fi

# Extract table items (skip header row and separator row)
# Table rows look like: | ... | ... | Item description |
ITEMS=()
while IFS= read -r line; do
  # Skip header row and separator row (separator has dashes: |---|---|---|)
  if [[ "$line" =~ ^[[:space:]]*\|[[:space:]]*Passed ]] || \
     [[ "$line" =~ ^[[:space:]]*\|[[:space:]]*-+[[:space:]]*\| ]]; then
    continue
  fi
  # Match data rows: | ... | ... | description |
  if [[ "$line" =~ ^[[:space:]]*\|.*\|.*\|(.+)\| ]]; then
    desc="${BASH_REMATCH[1]}"
    # Trim whitespace
    desc=$(echo "$desc" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [[ -n "$desc" ]]; then
      ITEMS+=("$desc")
    fi
  fi
done <<< "$SECTION"

if [[ ${#ITEMS[@]} -eq 0 ]]; then
  echo "No table items found in '${SECTION_HEADER}' section."
  echo "[]" > /tmp/validation-outcomes.json
  echo "No post-deploy validation items found." > /tmp/validation-results.md
  exit 0
fi

# Extract validate commands from HTML comment anchors
# Format: <!-- validate: Description --> followed by ```bash ... ```
declare -A COMMANDS
CURRENT_VALIDATE_DESC=""
IN_BASH_BLOCK=false
CURRENT_CMD=""

while IFS= read -r line; do
  # Match HTML comment anchor: <!-- validate: Description -->
  if [[ "$line" =~ ^[[:space:]]*\<!--[[:space:]]*validate:[[:space:]]*(.+)[[:space:]]*--\> ]]; then
    CURRENT_VALIDATE_DESC="${BASH_REMATCH[1]}"
    # Trim whitespace
    CURRENT_VALIDATE_DESC=$(echo "$CURRENT_VALIDATE_DESC" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    continue
  fi

  # Detect bash code fence
  if [[ "$line" =~ ^[[:space:]]*\`\`\`bash[[:space:]]*$ ]] && [[ -n "$CURRENT_VALIDATE_DESC" ]]; then
    IN_BASH_BLOCK=true
    CURRENT_CMD=""
    continue
  fi

  # Detect end of code fence
  if [[ "$line" =~ ^[[:space:]]*\`\`\`[[:space:]]*$ ]] && $IN_BASH_BLOCK; then
    IN_BASH_BLOCK=false
    COMMANDS["$CURRENT_VALIDATE_DESC"]="$CURRENT_CMD"
    CURRENT_VALIDATE_DESC=""
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
done <<< "$SECTION"

# Execute validation items that have commands
RESULTS_MD=""
OUTCOMES_JSON="[]"
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0

for desc in "${ITEMS[@]}"; do
  cmd="${COMMANDS[$desc]:-}"

  if [[ -z "$cmd" ]]; then
    echo "  Skipping manual item: $desc"
    TOTAL_SKIP=$((TOTAL_SKIP + 1))
    continue
  fi

  echo "  Running validation: $desc"

  output=$(timeout 30 bash -c "$cmd" 2>&1) && exit_code=0 || exit_code=$?

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
done

# Write results
HEADER="## ${SECTION_HEADER} Results

**${TOTAL_PASS} passed, ${TOTAL_FAIL} failed** out of $((TOTAL_PASS + TOTAL_FAIL)) validated items ($((TOTAL_SKIP)) manual items skipped).
"

echo "${HEADER}${RESULTS_MD}" > /tmp/validation-results.md
echo "$OUTCOMES_JSON" > /tmp/validation-outcomes.json

echo ""
echo "Results: ${TOTAL_PASS} passed, ${TOTAL_FAIL} failed, ${TOTAL_SKIP} skipped (manual)"

if [[ $TOTAL_FAIL -gt 0 ]]; then
  exit 1
fi
