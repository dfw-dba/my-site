---
globs:
  - "infrastructure/**"
---

# AWS CDK Rules

> **MANDATORY**: Bump the `DbMigration` version in `data-stack.ts` after ANY change to `database/` files.

## Rules

- **Bump CDK migration version after DB schema changes**: The `DbMigration` Custom Resource in `data-stack.ts` only re-runs when its `version` property changes. After adding or modifying ANY file in `database/` (init scripts, migrations, functions), bump the version. Failure to do so means schema changes will not deploy.
- **EC2 security group descriptions must be ASCII-only**: Never use non-ASCII characters (em dashes, curly quotes, etc.) in EC2 security group descriptions. CloudFormation will fail with `Character sets beyond ASCII are not supported`.
- **VPC Lambda cannot call most AWS APIs without endpoints**: Lambda in a VPC only has network access via VPC endpoints or NAT Gateways. This project has S3 gateway endpoint and Cognito IDP interface endpoint — no NAT Gateway (too expensive). Never add AWS API calls (CloudFront, SES, SNS, etc.) from the Lambda without first confirming a VPC endpoint exists or the call is non-blocking.
- **CloudFront cache policy names: no dots**: `cachePolicyName` only allows alphanumerics, hyphens, and underscores. Domain names with dots (e.g., `example.com`) must have dots replaced before using in policy names.
- **S3 bucket names are conditional**: Bucket naming is controlled by `CDK_AUTO_BUCKET_NAMES` (default `true`). When `true`, no `bucketName` property is set (CDK auto-generates). When `false`, explicit `${domainName}-frontend/media` names are used. Never hardcode bucket names directly — always use the `config.autoGenerateBucketNames` conditional.
- **Route 53 delegation set vs in-zone NS**: When referencing nameservers for delegation, always use `get-hosted-zone` (delegation set), NOT `list-resource-record-sets` (in-zone NS records). They can differ.
- **ACM cert DNS validation requires delegation first**: Deploying `MySiteCert` before DNS delegation is set up causes the deploy to hang indefinitely waiting for validation. Always deploy `MySiteDns` first, verify delegation, then deploy the rest.
- **All secrets must be CDK-created resources**: Never use `fromSecretNameV2()` or require manual `create-secret` commands. Create with `new secretsmanager.Secret(...)` using `generateSecretString` with placeholder values. Deployer populates real values post-deploy via `put-secret-value`.

## Style

### Secrets — Good

```typescript
const mySecret = new secretsmanager.Secret(this, "MySecret", {
  secretName: `${ssmPrefix}/my-credentials`,
  description: "Service credentials for XYZ",
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: "", password: "" }),
    generateStringKey: "_placeholder",
  },
});
```

### Secrets — Bad

```typescript
// Requires manual creation before deploy — breaks fork-and-deploy
const mySecret = secretsmanager.Secret.fromSecretNameV2(
  this, "MySecret", "/mysite/my-credentials",
);
```

## Verification

- Check migration version matches latest DB change: review `data-stack.ts` version property
- Check no manual secret lookups: `grep -r "fromSecretNameV2" infrastructure/`
