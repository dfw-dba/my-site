# Architecture Diagram

Interactive diagram of the production AWS infrastructure. Each account (production and staging) deploys the same 4 CDK stacks with environment-specific configuration.

> Staging deploys an identical stack structure in a separate AWS account with reduced retention, deletion protection disabled, and its own domain (`stage.yourdomain.com`).

## Infrastructure Overview

```mermaid
graph TB
    %% External
    User((User<br/>Browser))
    Registrar[Domain Registrar]
    MaxMind[MaxMind<br/>GeoLite2 API]

    %% ── MySiteDns Stack ──
    subgraph DnsStack["MySiteDns Stack"]
        R53[Route 53<br/>Hosted Zone]
    end

    %% ── MySiteCert Stack ──
    subgraph CertStack["MySiteCert Stack (us-east-1)"]
        ACMWild[ACM Wildcard Cert<br/>*.yourdomain.com]
    end

    %% ── MySiteApp Stack ──
    subgraph AppStack["MySiteApp Stack"]

        subgraph CDN["CloudFront Distribution"]
            CF[CloudFront<br/>HTTPS + Security Headers]
        end

        subgraph FrontendOrigin["Frontend Origin"]
            S3FE[S3 Bucket<br/>React SPA]
        end

        subgraph MediaOrigin["Media Origin"]
            S3Media[S3 Bucket<br/>Media Files]
        end

        subgraph API["API Layer"]
            APIGW[API Gateway v2<br/>HTTP API]
            APICert[ACM Regional Cert<br/>api.yourdomain.com]
        end

        subgraph Compute["Compute"]
            Lambda[Lambda<br/>FastAPI + Mangum]
        end

        subgraph Scheduled["Scheduled Tasks"]
            EBMaint[EventBridge<br/>Daily 03:00 UTC]
            EBMetrics[EventBridge<br/>Hourly]
        end

        Budget[Budget Alarm<br/>Email Notification]
    end

    %% ── MySiteData Stack ──
    subgraph DataStack["MySiteData Stack"]

        subgraph VPCNet["Default VPC"]

            subgraph DBLayer["Database Layer"]
                RDS[(RDS PostgreSQL 17<br/>db.t4g.micro<br/>IAM Auth + SSL)]
                DBCreds[Secrets Manager<br/>DB Credentials]
            end

            subgraph Auth["Authentication"]
                Cognito[Cognito User Pool<br/>MFA Required<br/>No Self-Signup]
                CognitoClient[User Pool Client<br/>SPA - SRP Auth]
            end

            subgraph Endpoints["VPC Endpoints"]
                VPES[Secrets Manager<br/>Interface Endpoint]
                VPEC[Cognito IDP<br/>Interface Endpoint]
                VPES3[S3 Gateway<br/>Endpoint]
            end

            subgraph Migration["Database Migration"]
                MigLambda[Migration Lambda<br/>Python 3.12]
                MigCR[CDK Custom Resource<br/>Runs on Deploy]
            end

            subgraph Admin["Administration"]
                Bastion[Bastion Host<br/>t4g.nano<br/>SSM Session Manager]
            end

            subgraph GeoIP["GeoIP Auto-Update"]
                ECSCluster[ECS Fargate Cluster]
                GeoIPTask[Fargate Task<br/>GeoLite2 Updater]
                EBGeo[EventBridge<br/>Wed + Sat 06:00 UTC]
                S3Trigger[S3 Trigger Bucket]
                TriggerLambda[Trigger Lambda]
                ScheduleLambda[Schedule Lambda]
                MaxMindCreds[Secrets Manager<br/>MaxMind Credentials]
            end
        end
    end

    %% ═══ Connections ═══

    %% DNS flow
    Registrar -->|NS Delegation| R53
    User -->|DNS Query| R53
    R53 -->|A Record| CF
    R53 -->|A Record| APIGW

    %% Cert references
    ACMWild -.->|Wildcard Cert| CF
    APICert -.->|Regional Cert| APIGW

    %% CloudFront to origins
    CF -->|"/ (default)"| S3FE
    CF -->|"media/*"| S3Media

    %% API flow
    User -->|"HTTPS API Calls"| APIGW
    APIGW -->|Lambda Integration| Lambda

    %% Lambda connections
    Lambda -->|IAM Auth| RDS
    Lambda -->|JWKS Validation| VPEC
    Lambda -->|Read/Write| S3Media
    Lambda -->|Trigger GeoIP| S3Trigger

    %% VPC Endpoint usage
    VPEC -.->|Private Link| Cognito
    VPES -.->|Private Link| DBCreds
    VPES3 -.->|Gateway| S3Media

    %% Auth flow
    User -->|"Login (SRP + TOTP)"| Cognito
    Cognito --> CognitoClient

    %% Migration
    MigCR -->|Invokes| MigLambda
    MigLambda -->|SQL Scripts| RDS
    MigLambda -->|Read Secret| VPES

    %% Bastion
    Bastion -->|psql| RDS

    %% GeoIP flows
    EBGeo -->|Scheduled| GeoIPTask
    S3Trigger -->|S3 Event| TriggerLambda
    TriggerLambda -->|ECS RunTask| GeoIPTask
    S3Trigger -->|S3 Event| ScheduleLambda
    ScheduleLambda -->|Update Rule| EBGeo
    GeoIPTask -->|Download DB| MaxMind
    GeoIPTask -->|Read Secret| MaxMindCreds
    GeoIPTask -->|Read Secret| DBCreds
    GeoIPTask -->|Update Tables| RDS

    %% Scheduled tasks
    EBMaint -->|Log Maintenance| Lambda
    EBMetrics -->|Metrics Capture| Lambda

    %% Styling
    classDef stack fill:#f0f4ff,stroke:#4a6fa5,stroke-width:2px
    classDef aws fill:#ff9900,stroke:#cc7a00,color:#fff
    classDef storage fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef compute fill:#10b981,stroke:#059669,color:#fff
    classDef security fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef external fill:#6b7280,stroke:#4b5563,color:#fff
    classDef database fill:#ef4444,stroke:#dc2626,color:#fff

    class DnsStack,CertStack,AppStack,DataStack stack
    class R53,CF,APIGW,ACMWild,APICert,EBMaint,EBMetrics,EBGeo,Budget aws
    class S3FE,S3Media,S3Trigger storage
    class Lambda,MigLambda,TriggerLambda,ScheduleLambda,GeoIPTask compute
    class Cognito,CognitoClient,DBCreds,MaxMindCreds,VPES,VPEC,VPES3,Bastion security
    class User,Registrar,MaxMind external
    class RDS database
```

## Request Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant R53 as Route 53
    participant CF as CloudFront
    participant S3 as S3 (SPA)
    participant APIGW as API Gateway v2
    participant L as Lambda (FastAPI)
    participant C as Cognito
    participant RDS as RDS PostgreSQL

    Note over U,RDS: Frontend Load
    U->>R53: DNS lookup (yourdomain.com)
    R53-->>U: CloudFront alias
    U->>CF: GET / (HTTPS)
    CF->>S3: Origin fetch (OAC)
    S3-->>CF: index.html + assets
    CF-->>U: SPA bundle (cached)

    Note over U,RDS: Authentication
    U->>C: Login (SRP + TOTP MFA)
    C-->>U: ID token + Access token (1hr)

    Note over U,RDS: API Request
    U->>R53: DNS lookup (api.yourdomain.com)
    R53-->>U: API Gateway alias
    U->>APIGW: GET /api/resource (+ Authorization header)
    APIGW->>L: Lambda integration
    L->>C: Validate JWT (JWKS via VPC endpoint)
    C-->>L: Token valid
    L->>RDS: Call stored function (IAM auth + SSL)
    RDS-->>L: JSONB result
    L-->>APIGW: HTTP response
    APIGW-->>U: JSON response (+ CORS headers)
```

## Stack Dependencies

```mermaid
graph LR
    DNS[MySiteDns<br/>Route 53] --> Cert[MySiteCert<br/>ACM Certs]
    DNS --> Data[MySiteData<br/>RDS, Cognito, VPC]
    DNS --> App[MySiteApp<br/>CloudFront, Lambda, API GW]
    Cert --> App
    Data --> App

    style DNS fill:#f0f4ff,stroke:#4a6fa5,stroke-width:2px
    style Cert fill:#f0f4ff,stroke:#4a6fa5,stroke-width:2px
    style Data fill:#f0f4ff,stroke:#4a6fa5,stroke-width:2px
    style App fill:#f0f4ff,stroke:#4a6fa5,stroke-width:2px
```
