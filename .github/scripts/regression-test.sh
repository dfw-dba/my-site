#!/usr/bin/env bash
set -euo pipefail

# Runs a fixed regression test suite against all public endpoints and the
# frontend. Designed to run on every deploy (staging and production) to catch
# breakages in existing functionality.
#
# Usage: regression-test.sh [environment-label]
# Env: API_URL, DOMAIN_NAME (injected by workflow)
#
# Arguments:
#   environment-label - (optional) "Stage" or "Production" (default: "Stage")
#
# Outputs:
#   /tmp/regression-results.md - markdown comment body with pass/fail details
#   Exit code 1 if any test fails

ENV_LABEL="${1:-Stage}"

: "${API_URL:?API_URL must be set}"
: "${DOMAIN_NAME:?DOMAIN_NAME must be set}"

PASS=0
FAIL=0
RESULTS_MD=""

# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

# run_test <description> <command>
#   Executes command with 30s timeout, records pass/fail.
run_test() {
  local desc="$1"
  local cmd="$2"

  echo "  Testing: $desc"

  local output exit_code
  output=$(timeout 30 bash -c "$cmd" 2>&1) && exit_code=0 || exit_code=$?

  local status_icon
  if [[ $exit_code -eq 0 ]]; then
    status_icon="PASS"
    PASS=$((PASS + 1))
  else
    status_icon="FAIL"
    FAIL=$((FAIL + 1))
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
}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

echo "Running ${ENV_LABEL} regression tests..."
echo ""

# --- Health endpoint ---
run_test "Health endpoint returns healthy status" \
  'response=$(curl -sfL "${API_URL}/api/health") && echo "$response" | jq -e ".status == \"healthy\"" > /dev/null && echo "$response" | jq -e ".version" > /dev/null && echo "$response"'

# --- Public resume endpoints ---
run_test "Resume endpoint returns valid JSON" \
  'response=$(curl -sfL "${API_URL}/api/resume/") && echo "$response" | jq . > /dev/null && echo "$response" | jq .'

run_test "Contact endpoint returns valid JSON" \
  'response=$(curl -sfL "${API_URL}/api/resume/contact") && echo "$response" | jq . > /dev/null && echo "$response" | jq .'

run_test "Timeline endpoint returns valid JSON" \
  'response=$(curl -sfL "${API_URL}/api/resume/timeline") && echo "$response" | jq . > /dev/null && echo "$response" | jq .'

# --- Admin auth enforcement ---
run_test "Admin logs endpoint rejects unauthenticated requests" \
  'status=$(curl -sL -o /dev/null -w "%{http_code}" "${API_URL}/api/admin/logs") && echo "HTTP $status" && [[ "$status" == "401" || "$status" == "403" ]]'

run_test "Admin resume entry endpoint rejects unauthenticated requests" \
  'status=$(curl -sL -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/admin/resume/entry") && echo "HTTP $status" && [[ "$status" == "401" || "$status" == "403" ]]'

# --- Frontend ---
run_test "Frontend serves HTML" \
  'response=$(curl -sfL "https://${DOMAIN_NAME}/") && echo "$response" | grep -qi "<!doctype\|<html" && echo "HTML document received ($(echo "$response" | wc -c) bytes)"'

# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed out of $((PASS + FAIL)) tests"

HEADER="## ${ENV_LABEL} Regression Test Results

**${PASS} passed, ${FAIL} failed** out of $((PASS + FAIL)) tests.
"

echo "${HEADER}${RESULTS_MD}" > /tmp/regression-results.md

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
