#!/bin/bash
set -euo pipefail

ERRORS=0
WARNINGS=0

echo "=== Pre-flight Deployment Check ==="

# Check OIDC provider exists (skip if deploy role lacks iam:List* permissions)
OIDC_OUTPUT=$(aws iam list-open-id-connect-providers --query 'OpenIDConnectProviderList[*].Arn' --output text 2>&1) && {
  if echo "$OIDC_OUTPUT" | grep -q "token.actions.githubusercontent.com"; then
    echo "PASS: OIDC provider exists"
  else
    echo "FAIL: OIDC provider not found"
    ERRORS=$((ERRORS+1))
  fi
} || {
  if echo "$OIDC_OUTPUT" | grep -q "AccessDenied"; then
    echo "SKIP: OIDC check (deploy role lacks iam:ListOpenIDConnectProviders)"
  else
    echo "FAIL: OIDC check error: $OIDC_OUTPUT"
    ERRORS=$((ERRORS+1))
  fi
}

# Check CDK is bootstrapped
CDK_STATUS=$(aws cloudformation describe-stacks --stack-name CDKToolkit \
  --query 'Stacks[0].StackStatus' --output text 2>&1) || CDK_STATUS="DOES_NOT_EXIST"
if echo "$CDK_STATUS" | grep -q "COMPLETE"; then
  echo "PASS: CDK bootstrapped ($CDK_STATUS)"
elif echo "$CDK_STATUS" | grep -q "AccessDenied"; then
  echo "SKIP: CDK bootstrap check (deploy role lacks cloudformation:DescribeStacks for CDKToolkit)"
else
  echo "FAIL: CDK not bootstrapped (status: $CDK_STATUS)"
  ERRORS=$((ERRORS+1))
fi

# Check for broken stacks (informational — cleanup step handles this)
for stack in MySiteDns MySiteCert MySiteData MySiteApp; do
  status=$(aws cloudformation describe-stacks --stack-name "$stack" \
    --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
  case "$status" in
    ROLLBACK_COMPLETE|ROLLBACK_FAILED|DELETE_FAILED)
      echo "WARN: $stack is in $status state (will be cleaned up automatically)"
      WARNINGS=$((WARNINGS+1))
      ;;
  esac
done

echo ""
echo "Results: $ERRORS errors, $WARNINGS warnings"
if [ "$ERRORS" -gt 0 ]; then
  echo "::error::Pre-flight check failed with $ERRORS error(s). Fix the issues above before deploying."
  exit 1
fi
