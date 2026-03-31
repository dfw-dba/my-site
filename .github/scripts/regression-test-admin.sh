#!/usr/bin/env bash
set -euo pipefail

# Runs a comprehensive regression test suite against all admin portal endpoints.
# Tests every CRUD operation, verifies via public API, and leaves test data in place
# for visual verification between deploys. Data is wiped at the start of each run.
# Designed to run on staging deploys only (requires REGRESSION_TEST_API_KEY).
#
# Usage: regression-test-admin.sh [environment-label]
# Env: API_URL, DOMAIN_NAME, REGRESSION_TEST_API_KEY (injected by workflow)
#
# Arguments:
#   environment-label - (optional) "Stage" or "Production" (default: "Stage")
#
# Outputs:
#   /tmp/admin-regression-results.md - markdown comment body with pass/fail details
#   Exit code 1 if any test fails

ENV_LABEL="${1:-Stage}"

: "${API_URL:?API_URL must be set}"
: "${DOMAIN_NAME:?DOMAIN_NAME must be set}"
: "${REGRESSION_TEST_API_KEY:?REGRESSION_TEST_API_KEY must be set}"

export AUTH_HEADER="X-Regression-Key: ${REGRESSION_TEST_API_KEY}"
export BASE="${API_URL}/api"

PASS=0
FAIL=0
SKIP=0
RESULTS_MD=""

# IDs captured during create tests (used by update/delete tests)
WORK_ENTRY_ID=""
EDUCATION_ENTRY_ID=""
CERT_ENTRY_ID=""
AWARD_ENTRY_ID=""
HOBBY_ENTRY_ID=""
REVIEW_ID=""

# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

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

skip_test() {
  local desc="$1"
  local reason="$2"

  echo "  Skipping: $desc ($reason)"
  SKIP=$((SKIP + 1))

  RESULTS_MD="${RESULTS_MD}
### SKIP: ${desc}

<details>
<summary>${reason}</summary>

\`\`\`
Skipped due to dependency failure.
\`\`\`

</details>
"
}


# ---------------------------------------------------------------------------
# Phase 0: Preflight
# ---------------------------------------------------------------------------

echo "Running ${ENV_LABEL} admin regression tests..."
echo ""
echo "--- Phase 0: Preflight ---"

run_test "Auth preflight - admin endpoint accessible" \
  'response=$(curl -sf -H "'"${AUTH_HEADER}"'" "${BASE}/admin/logs/stats") && echo "$response" | jq -e ".total_24h" > /dev/null && echo "Auth OK: $response"'

if [[ $FAIL -gt 0 ]]; then
  echo "FATAL: Auth preflight failed. Cannot continue admin regression tests."
  echo "Ensure REGRESSION_TEST_API_KEY is set on the staging Lambda."

  HEADER="## ${ENV_LABEL} Admin Regression Test Results

**0 passed, 1 failed** out of 1 tests.

> Auth preflight failed. Ensure \`REGRESSION_TEST_API_KEY\` GitHub Secret is configured
> and the staging Lambda has the env var set.
"
  echo "${HEADER}${RESULTS_MD}" > /tmp/admin-regression-results.md
  exit 1
fi

# ---------------------------------------------------------------------------
# Phase 1: Cleanup existing data
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 1: Cleanup existing data ---"

# Fetch all existing entries and delete them
existing=$(curl -sf "${BASE}/resume/" || echo '{}')
for entry_type in work education certification award hobby; do
  ids=$(echo "$existing" | jq -r ".entries.${entry_type}[]?.id // empty" 2>/dev/null || true)
  for eid in $ids; do
    echo "  Cleaning up existing entry: ${entry_type} #${eid}"
    curl -sf -X DELETE -H "${AUTH_HEADER}" "${BASE}/admin/resume/entry/${eid}" > /dev/null 2>&1 || true
  done
done

# Clear single-row sections
curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  -d '{"items": []}' "${BASE}/admin/resume/recommendations" > /dev/null 2>&1 || true

echo "  Pre-test cleanup complete."

# ---------------------------------------------------------------------------
# Phase 2: Resume section tests
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 2: Resume section tests ---"

run_test "Set resume title" \
  'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"title": "REGTEST Resume Title"}'"'"' "${BASE}/admin/resume/title") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && verify=$(curl -sf "${BASE}/resume/") \
  && echo "$verify" | jq -e ".sections.title.title == \"REGTEST Resume Title\"" > /dev/null \
  && echo "Title set and verified via public API"'

run_test "Set resume summary" \
  'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"headline": "REGTEST Headline", "text": "REGTEST summary text for testing"}'"'"' "${BASE}/admin/resume/summary") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && verify=$(curl -sf "${BASE}/resume/") \
  && echo "$verify" | jq -e ".sections.summary.text == \"REGTEST summary text for testing\"" > /dev/null \
  && echo "Summary set and verified via public API"'

run_test "Set contact info" \
  'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"linkedin": "https://www.linkedin.com/in/regtest", "github": "https://github.com/regtest", "email": "regtest@example.com"}'"'"' "${BASE}/admin/resume/contact") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && verify=$(curl -sf "${BASE}/resume/contact") \
  && echo "$verify" | jq -e ".email == \"regtest@example.com\"" > /dev/null \
  && echo "Contact set and verified: $verify"'

# Generate a minimal valid 1x1 white PNG (68 bytes)
TMPIMG=$(mktemp /tmp/regtest-XXXXXX.png)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "$TMPIMG"

run_test "Upload profile image" \
  'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" \
    -F "file=@'"${TMPIMG}"';type=image/png" "${BASE}/admin/resume/profile-image") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && echo "$response" | jq -e ".image_url" > /dev/null \
  && echo "Profile image uploaded: $(echo "$response" | jq -r .image_url)"'

rm -f "$TMPIMG"

# ---------------------------------------------------------------------------
# Phase 3: Professional entry CRUD
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 3: Professional entry CRUD ---"

# Create work entry
output=$(timeout 30 bash -c '
  response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"entry_type": "work", "title": "REGTEST Software Engineer", "organization": "REGTEST Corp", "location": "Remote", "start_date": "2020-01-01", "end_date": "2024-01-01", "description": "REGTEST work description", "highlights": ["Built systems", "Led projects"], "technologies": ["python", "aws", "docker"], "sort_order": 0}'"'"' "${BASE}/admin/resume/entry") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && echo "$response" | jq -r ".id"
' 2>&1) && exit_code=0 || exit_code=$?

if [[ $exit_code -eq 0 && -n "$output" && "$output" =~ ^[0-9]+$ ]]; then
  WORK_ENTRY_ID="$output"
  PASS=$((PASS + 1))
  RESULTS_MD="${RESULTS_MD}
### PASS: Create work entry

<details>
<summary>Output (exit code: 0)</summary>

\`\`\`
Created work entry with ID: ${WORK_ENTRY_ID}
\`\`\`

</details>
"
  echo "  Testing: Create work entry - PASS (ID: ${WORK_ENTRY_ID})"
else
  FAIL=$((FAIL + 1))
  RESULTS_MD="${RESULTS_MD}
### FAIL: Create work entry

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"
  echo "  Testing: Create work entry - FAIL"
fi

# Create education entry
output=$(timeout 30 bash -c '
  response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"entry_type": "education", "title": "REGTEST BS Computer Science", "organization": "REGTEST University", "start_date": "2014-09-01", "end_date": "2018-05-01", "sort_order": 0}'"'"' "${BASE}/admin/resume/entry") \
  && echo "$response" | jq -r ".id"
' 2>&1) && exit_code=0 || exit_code=$?

if [[ $exit_code -eq 0 && -n "$output" && "$output" =~ ^[0-9]+$ ]]; then
  EDUCATION_ENTRY_ID="$output"
  PASS=$((PASS + 1))
  echo "  Testing: Create education entry - PASS (ID: ${EDUCATION_ENTRY_ID})"
  RESULTS_MD="${RESULTS_MD}
### PASS: Create education entry

<details>
<summary>Output (exit code: 0)</summary>

\`\`\`
Created education entry with ID: ${EDUCATION_ENTRY_ID}
\`\`\`

</details>
"
else
  FAIL=$((FAIL + 1))
  echo "  Testing: Create education entry - FAIL"
  RESULTS_MD="${RESULTS_MD}
### FAIL: Create education entry

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"
fi

# Create certification entry
output=$(timeout 30 bash -c '
  response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"entry_type": "certification", "title": "REGTEST AWS Solutions Architect", "organization": "Amazon Web Services", "start_date": "2023-01-01", "sort_order": 0}'"'"' "${BASE}/admin/resume/entry") \
  && echo "$response" | jq -r ".id"
' 2>&1) && exit_code=0 || exit_code=$?

if [[ $exit_code -eq 0 && -n "$output" && "$output" =~ ^[0-9]+$ ]]; then
  CERT_ENTRY_ID="$output"
  PASS=$((PASS + 1))
  echo "  Testing: Create certification entry - PASS (ID: ${CERT_ENTRY_ID})"
  RESULTS_MD="${RESULTS_MD}
### PASS: Create certification entry

<details>
<summary>Output (exit code: 0)</summary>

\`\`\`
Created certification entry with ID: ${CERT_ENTRY_ID}
\`\`\`

</details>
"
else
  FAIL=$((FAIL + 1))
  echo "  Testing: Create certification entry - FAIL"
  RESULTS_MD="${RESULTS_MD}
### FAIL: Create certification entry

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"
fi

# Create award entry
output=$(timeout 30 bash -c '
  response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"entry_type": "award", "title": "REGTEST Employee of the Year", "organization": "REGTEST Corp", "start_date": "2023-06-01", "sort_order": 0}'"'"' "${BASE}/admin/resume/entry") \
  && echo "$response" | jq -r ".id"
' 2>&1) && exit_code=0 || exit_code=$?

if [[ $exit_code -eq 0 && -n "$output" && "$output" =~ ^[0-9]+$ ]]; then
  AWARD_ENTRY_ID="$output"
  PASS=$((PASS + 1))
  echo "  Testing: Create award entry - PASS (ID: ${AWARD_ENTRY_ID})"
  RESULTS_MD="${RESULTS_MD}
### PASS: Create award entry

<details>
<summary>Output (exit code: 0)</summary>

\`\`\`
Created award entry with ID: ${AWARD_ENTRY_ID}
\`\`\`

</details>
"
else
  FAIL=$((FAIL + 1))
  echo "  Testing: Create award entry - FAIL"
  RESULTS_MD="${RESULTS_MD}
### FAIL: Create award entry

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"
fi

# Create hobby entry
output=$(timeout 30 bash -c '
  response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"entry_type": "hobby", "title": "REGTEST Open Source Contributing", "organization": "GitHub", "start_date": "2015-01-01", "sort_order": 0}'"'"' "${BASE}/admin/resume/entry") \
  && echo "$response" | jq -r ".id"
' 2>&1) && exit_code=0 || exit_code=$?

if [[ $exit_code -eq 0 && -n "$output" && "$output" =~ ^[0-9]+$ ]]; then
  HOBBY_ENTRY_ID="$output"
  PASS=$((PASS + 1))
  echo "  Testing: Create hobby entry - PASS (ID: ${HOBBY_ENTRY_ID})"
  RESULTS_MD="${RESULTS_MD}
### PASS: Create hobby entry

<details>
<summary>Output (exit code: 0)</summary>

\`\`\`
Created hobby entry with ID: ${HOBBY_ENTRY_ID}
\`\`\`

</details>
"
else
  FAIL=$((FAIL + 1))
  echo "  Testing: Create hobby entry - FAIL"
  RESULTS_MD="${RESULTS_MD}
### FAIL: Create hobby entry

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"
fi

# Verify all entries via public API
run_test "Verify entries visible in public resume" \
  'response=$(curl -sf "${BASE}/resume/") \
  && echo "$response" | jq -e ".entries.work | length > 0" > /dev/null \
  && echo "$response" | jq -e ".entries.education | length > 0" > /dev/null \
  && echo "$response" | jq -e ".entries.certification | length > 0" > /dev/null \
  && echo "$response" | jq -e ".entries.award | length > 0" > /dev/null \
  && echo "$response" | jq -e ".entries.hobby | length > 0" > /dev/null \
  && echo "All 5 entry types present in public resume"'

# Update work entry
if [[ -n "$WORK_ENTRY_ID" ]]; then
  run_test "Update work entry title" \
    'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
      -d '"'"'{"id": '"${WORK_ENTRY_ID}"', "entry_type": "work", "title": "REGTEST Senior Engineer", "organization": "REGTEST Corp", "start_date": "2020-01-01", "sort_order": 0}'"'"' "${BASE}/admin/resume/entry") \
    && echo "$response" | jq -e ".success == true" > /dev/null \
    && verify=$(curl -sf "${BASE}/resume/") \
    && echo "$verify" | jq -e ".entries.work[0].title == \"REGTEST Senior Engineer\"" > /dev/null \
    && echo "Work entry updated and verified"'
else
  skip_test "Update work entry title" "work entry creation failed"
fi

# ---------------------------------------------------------------------------
# Phase 4: Performance review CRUD
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 4: Performance review CRUD ---"

if [[ -n "$WORK_ENTRY_ID" ]]; then
  # Create review
  output=$(timeout 30 bash -c '
    response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
      -d '"'"'{"entry_id": '"${WORK_ENTRY_ID}"', "reviewer_name": "REGTEST Manager", "reviewer_title": "VP of Engineering", "review_date": "2023-12-01", "review_text": "REGTEST excellent performance throughout the year", "sort_order": 0}'"'"' "${BASE}/admin/resume/review") \
    && echo "$response" | jq -e ".success == true" > /dev/null \
    && echo "$response" | jq -r ".id"
  ' 2>&1) && exit_code=0 || exit_code=$?

  if [[ $exit_code -eq 0 && -n "$output" && "$output" =~ ^[0-9]+$ ]]; then
    REVIEW_ID="$output"
    PASS=$((PASS + 1))
    echo "  Testing: Create performance review - PASS (ID: ${REVIEW_ID})"
    RESULTS_MD="${RESULTS_MD}
### PASS: Create performance review

<details>
<summary>Output (exit code: 0)</summary>

\`\`\`
Created review with ID: ${REVIEW_ID}
\`\`\`

</details>
"
  else
    FAIL=$((FAIL + 1))
    echo "  Testing: Create performance review - FAIL"
    RESULTS_MD="${RESULTS_MD}
### FAIL: Create performance review

<details>
<summary>Output (exit code: ${exit_code})</summary>

\`\`\`
${output}
\`\`\`

</details>
"
  fi

  # Verify review via public API
  run_test "Verify review in public resume" \
    'response=$(curl -sf "${BASE}/resume/") \
    && echo "$response" | jq -e ".entries.work[0].performance_reviews | length > 0" > /dev/null \
    && echo "$response" | jq -e ".entries.work[0].performance_reviews[0].reviewer_name == \"REGTEST Manager\"" > /dev/null \
    && echo "Review visible in public resume"'

  # Update review
  if [[ -n "$REVIEW_ID" ]]; then
    run_test "Update performance review" \
      'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
        -d '"'"'{"id": '"${REVIEW_ID}"', "entry_id": '"${WORK_ENTRY_ID}"', "reviewer_name": "REGTEST Updated Manager", "review_text": "REGTEST updated review text", "sort_order": 0}'"'"' "${BASE}/admin/resume/review") \
      && echo "$response" | jq -e ".success == true" > /dev/null \
      && verify=$(curl -sf "${BASE}/resume/") \
      && echo "$verify" | jq -e ".entries.work[0].performance_reviews[0].reviewer_name == \"REGTEST Updated Manager\"" > /dev/null \
      && echo "Review updated and verified"'

    run_test "Delete performance review" \
      'response=$(curl -sf -X DELETE -H "'"${AUTH_HEADER}"'" "${BASE}/admin/resume/review/'"${REVIEW_ID}"'") \
      && echo "$response" | jq -e ".success == true" > /dev/null \
      && verify=$(curl -sf "${BASE}/resume/") \
      && reviews=$(echo "$verify" | jq ".entries.work[0].performance_reviews | length") \
      && [[ "$reviews" == "0" ]] \
      && echo "Review deleted and verified gone"'
  else
    skip_test "Update performance review" "review creation failed"
    skip_test "Delete performance review" "review creation failed"
  fi
else
  skip_test "Create performance review" "work entry creation failed"
  skip_test "Verify review in public resume" "work entry creation failed"
  skip_test "Update performance review" "work entry creation failed"
  skip_test "Delete performance review" "work entry creation failed"
fi

# ---------------------------------------------------------------------------
# Phase 5: Recommendations
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 5: Recommendations ---"

run_test "Add recommendations" \
  'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"items": [{"author": "REGTEST Recommender", "title": "CTO at REGTEST Inc", "text": "REGTEST outstanding colleague and engineer", "linkedin_url": "https://www.linkedin.com/in/regtest-rec"}]}'"'"' "${BASE}/admin/resume/recommendations") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && verify=$(curl -sf "${BASE}/resume/") \
  && echo "$verify" | jq -e ".sections.recommendations.items[0].author == \"REGTEST Recommender\"" > /dev/null \
  && echo "Recommendations set and verified"'

# ---------------------------------------------------------------------------
# Phase 6: Logs endpoints
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 6: Logs endpoints ---"

run_test "Get application logs" \
  'response=$(curl -sf -H "'"${AUTH_HEADER}"'" "${BASE}/admin/logs?limit=5") \
  && echo "$response" | jq -e ".logs" > /dev/null \
  && echo "$response" | jq -e ".total" > /dev/null \
  && echo "Logs endpoint OK: $(echo "$response" | jq .total) total logs"'

run_test "Get log stats" \
  'response=$(curl -sf -H "'"${AUTH_HEADER}"'" "${BASE}/admin/logs/stats") \
  && echo "$response" | jq -e ".total_24h" > /dev/null \
  && echo "$response" | jq -e ".errors_24h" > /dev/null \
  && echo "$response" | jq -e ".avg_duration_ms" > /dev/null \
  && echo "Stats: $response"'

run_test "Get threat detections" \
  'response=$(curl -sf -H "'"${AUTH_HEADER}"'" "${BASE}/admin/logs/threats?days=7") \
  && echo "$response" | jq -e ".total_threats" > /dev/null \
  && echo "$response" | jq -e ".days" > /dev/null \
  && echo "Threats: $(echo "$response" | jq .total_threats) total"'

run_test "Purge old logs (365+ days)" \
  'response=$(curl -sf -X POST -H "'"${AUTH_HEADER}"'" -H "Content-Type: application/json" \
    -d '"'"'{"days": 365}'"'"' "${BASE}/admin/logs/purge") \
  && echo "$response" | jq -e ".success == true" > /dev/null \
  && echo "Purge OK: $(echo "$response" | jq .deleted) logs deleted"'

# ---------------------------------------------------------------------------
# Phase 7: Public verification (data should persist for visual inspection)
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 7: Public verification ---"

run_test "Resume API returns test data" \
  'response=$(curl -sf "${BASE}/resume/") \
  && work=$(echo "$response" | jq ".entries.work // [] | length") \
  && edu=$(echo "$response" | jq ".entries.education // [] | length") \
  && cert=$(echo "$response" | jq ".entries.certification // [] | length") \
  && award=$(echo "$response" | jq ".entries.award // [] | length") \
  && hobby=$(echo "$response" | jq ".entries.hobby // [] | length") \
  && [[ "$work" -ge 1 && "$edu" -ge 1 && "$cert" -ge 1 && "$award" -ge 1 && "$hobby" -ge 1 ]] \
  && echo "All 5 entry types present: work=$work edu=$edu cert=$cert award=$award hobby=$hobby"'

run_test "Frontend serves HTML" \
  'response=$(curl -sfL "https://${DOMAIN_NAME}/") \
  && echo "$response" | grep -qi "<!doctype\|<html" \
  && echo "HTML document received ($(echo "$response" | wc -c) bytes)"'

run_test "Resume page serves HTML" \
  'response=$(curl -sfL "https://${DOMAIN_NAME}/resume") \
  && echo "$response" | grep -qi "<!doctype\|<html" \
  && echo "Resume page received ($(echo "$response" | wc -c) bytes)"'

# ---------------------------------------------------------------------------
# Phase 8: Auth enforcement (negative tests)
# ---------------------------------------------------------------------------

echo ""
echo "--- Phase 8: Auth enforcement ---"

run_test "Admin endpoint rejects missing auth" \
  'status=$(curl -sL -o /dev/null -w "%{http_code}" "${BASE}/admin/logs") \
  && echo "HTTP $status" \
  && [[ "$status" == "401" || "$status" == "403" ]]'

run_test "Admin endpoint rejects invalid regression key" \
  'status=$(curl -sL -o /dev/null -w "%{http_code}" -H "X-Regression-Key: wrong-key-value" "${BASE}/admin/logs") \
  && echo "HTTP $status" \
  && [[ "$status" == "401" ]]'

# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

echo ""
TOTAL=$((PASS + FAIL + SKIP))
echo "Results: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped out of ${TOTAL} tests"

HEADER="## ${ENV_LABEL} Admin Regression Test Results

**${PASS} passed, ${FAIL} failed, ${SKIP} skipped** out of ${TOTAL} tests.
"

echo "${HEADER}${RESULTS_MD}" > /tmp/admin-regression-results.md

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
