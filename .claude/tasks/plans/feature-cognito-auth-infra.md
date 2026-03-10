# Plan: AWS CDK Infrastructure + CD Pipeline

Branch: `feature/cognito-auth`

## Summary
Full AWS infrastructure via CDK (TypeScript) and GitHub Actions CD pipeline.
4 CDK stacks: DNS → Cert → Data → App.
Lambda + API Gateway v2 backend, S3 + CloudFront frontend, RDS PostgreSQL, Cognito user pool.

## Implementation Phases

### Phase 1: CDK Project Setup
- `infrastructure/cdk/` — package.json, tsconfig, cdk.json, config/index.ts
- DnsStack (Route 53 hosted zone)
- CertStack (ACM cert in us-east-1)

### Phase 2: DataStack
- VPC (default), RDS PostgreSQL 17, Cognito user pool, VPC endpoint, SSM params, ECR repo

### Phase 3: Lambda Backend Prep
- Add mangum to pyproject.toml
- Create lambda_handler.py
- Create Dockerfile.lambda

### Phase 4: AppStack
- S3 + CloudFront, Lambda, API Gateway v2, Route 53 records, media S3 bucket, budget alarm

### Phase 5: CD Pipeline
- deploy.yml with 3 jobs: infra, backend, frontend

### Phase 6: Config Updates
- .env.example updates
