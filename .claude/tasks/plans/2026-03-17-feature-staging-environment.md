# Staging Environment with Approval Gate

**Branch**: `feature/staging-environment`
**Status**: In Progress

## Summary
Deploy changes to staging before production with a GitHub Environment approval gate.
Staging is a full replica (own RDS, S3, CloudFront, Lambda, API GW) sharing Cognito, DNS, wildcard cert, and default VPC.
Opt-in via `DEPLOY_STAGING` GitHub Actions variable.

## Changes
1. `infrastructure/cdk/config/index.ts` — Add `deployStaging` flag
2. `infrastructure/cdk/lib/data-stack.ts` — Parameterize for staging (skip Cognito/VPC endpoints/bastion, DESTROY policies, export bastion SG)
3. `infrastructure/cdk/lib/app-stack.ts` — Parameterize for staging (stage domains, skip budget, DESTROY policies)
4. `infrastructure/cdk/bin/app.ts` — Conditionally create staging stacks
5. `.github/workflows/deploy.yml` — Add staging deploy → approval → prod flow
6. `README.md` — Document staging environment
