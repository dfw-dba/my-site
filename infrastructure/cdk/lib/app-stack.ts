import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";
import { Construct } from "constructs";
import { config } from "../config";

interface AppStackProps extends cdk.StackProps {
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
  database: rds.IDatabaseInstance;
  databaseSecurityGroup: ec2.ISecurityGroup;
  vpc: ec2.IVpc;
  userPoolId: string;
  userPoolClientId: string;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const isStaging = config.isStaging;
    const namePrefix = isStaging ? "stage-" : "";
    const frontendDomain = config.domainName;
    const apiDomainName = `api.${config.domainName}`;

    // --- Frontend: S3 + CloudFront ---

    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: config.autoGenerateBucketNames
        ? undefined
        : `${config.domainName}-frontend`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    cdk.Tags.of(frontendBucket).add("Purpose", "frontend-hosting");
    cdk.Tags.of(frontendBucket).add(
      "Environment",
      isStaging ? "staging" : "production",
    );

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeadersPolicy",
      {
        responseHeadersPolicyName: `${config.domainName.replace(/\./g, "-")}-security-headers`,
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(63072000),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          contentSecurityPolicy: {
            contentSecurityPolicy: [
              "default-src 'self'",
              "script-src 'self' 'sha256-5VlZwYLCiP15nj7r14eR3kRiZdB8XV5vD0eUGGQK/9o='",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              `connect-src 'self' https://${apiDomainName} https://cognito-idp.${config.awsRegion}.amazonaws.com`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
            override: true,
          },
        },
      },
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
      },
      domainNames: [frontendDomain],
      certificate: props.certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // --- Media S3 Bucket ---

    const mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: config.autoGenerateBucketNames
        ? undefined
        : `${config.domainName}-media`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: !isStaging,
      removalPolicy: isStaging
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: isStaging,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: [`https://${frontendDomain}`],
          allowedHeaders: [
            "Authorization",
            "Content-Type",
            "x-amz-content-sha256",
            "x-amz-date",
            "x-amz-security-token",
          ],
          maxAge: 3600,
        },
      ],
      lifecycleRules: isStaging
        ? undefined
        : [
            {
              noncurrentVersionExpiration: cdk.Duration.days(30),
              enabled: true,
            },
          ],
    });
    cdk.Tags.of(mediaBucket).add("Purpose", "media-storage");
    cdk.Tags.of(mediaBucket).add(
      "Environment",
      isStaging ? "staging" : "production",
    );

    // Cache policy for media: includes query strings in cache key so that
    // ?v={timestamp} busts the CDN cache after re-uploads (avoids needing
    // CloudFront invalidation API calls, which can't be made from VPC Lambda)
    const mediaCachePolicy = new cloudfront.CachePolicy(
      this,
      "MediaCachePolicy",
      {
        cachePolicyName: `${config.domainName.replace(/\./g, "-")}-media-cache`,
        defaultTtl: cdk.Duration.hours(24),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.seconds(0),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      },
    );

    // Serve media files through CloudFront (same distribution as frontend)
    distribution.addBehavior(
      "media/*",
      origins.S3BucketOrigin.withOriginAccessControl(mediaBucket),
      {
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: mediaCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
    );

    // --- Backend: Lambda ---

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      "LambdaSecurityGroup",
      {
        vpc: props.vpc,
        description: "Security group for Lambda function",
        allowAllOutbound: true,
      },
    );

    // Allow Lambda to connect to RDS (CfnSecurityGroupIngress avoids cross-stack cycle)
    new ec2.CfnSecurityGroupIngress(this, "LambdaToRdsIngress", {
      ipProtocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      groupId: props.databaseSecurityGroup.securityGroupId,
      sourceSecurityGroupId: lambdaSecurityGroup.securityGroupId,
      description: "Lambda to RDS",
    });

    const dbUser = "lambda_iam";

    const repoRoot = path.resolve(__dirname, "..", "..", "..");

    const backendFn = new lambda.DockerImageFunction(this, "BackendFunction", {
      functionName: isStaging ? "mysite-stage-backend" : "mysite-backend",
      code: lambda.DockerImageCode.fromImageAsset(repoRoot, {
        file: "docker/backend/Dockerfile.lambda",
        platform: ecr_assets.Platform.LINUX_AMD64,
        exclude: [
          "infrastructure/cdk/cdk.out",
          "infrastructure/cdk/node_modules",
          "frontend",
          ".git",
          "node_modules",
          "minio-data",
        ],
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: config.lambdaMemoryMb,
      timeout: cdk.Duration.seconds(30),
      vpc: props.vpc,
      // Public subnets provide outbound internet access (for Cognito JWKS
      // validation, etc.) without a NAT Gateway (~$32/mo per AZ). Lambda
      // ENIs do NOT accept inbound connections from the internet -- all
      // invocations route through API Gateway. The security group has no
      // 0.0.0.0/0 inbound rules.
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [lambdaSecurityGroup],
      environment: {
        COGNITO_USER_POOL_ID: props.userPoolId,
        COGNITO_APP_CLIENT_ID: props.userPoolClientId,
        COGNITO_REGION: config.awsRegion,
        CORS_ORIGINS: `https://${frontendDomain}`,
        MEDIA_BUCKET: mediaBucket.bucketName,
        MEDIA_CDN_URL: `https://${frontendDomain}`,
        DB_HOST: props.database.dbInstanceEndpointAddress,
        DB_PORT: "5432",
        DB_USER: dbUser,
        DB_NAME: "mysite",
        AWS_LWA_INVOKE_MODE: "BUFFERED",
        ...(isStaging && process.env.REGRESSION_TEST_API_KEY
          ? { REGRESSION_TEST_API_KEY: process.env.REGRESSION_TEST_API_KEY }
          : {}),
      },
    });

    // Grant Lambda permission to generate RDS IAM auth tokens.
    // The resource ARN uses a wildcard for the DB resource ID because CDK
    // exposes dbInstanceIdentifier (user-facing name), not DbiResourceId
    // (the internal ID required in rds-db:connect ARNs). With a single RDS
    // instance in the account, this is functionally equivalent to a scoped ARN.
    backendFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rds-db:connect"],
        resources: [
          `arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/${dbUser}`,
        ],
      }),
    );

    // Grant Lambda least-privilege access to media bucket (read + put).
    // Delete is not granted -- profile image uploads overwrite in place.
    mediaBucket.grantRead(backendFn);
    mediaBucket.grantPut(backendFn);

    // --- Scheduled Log Maintenance (daily at 03:00 UTC) ---

    new events.Rule(this, "LogMaintenanceSchedule", {
      ruleName: `${namePrefix}mysite-log-maintenance`,
      description: "Daily purge of app_logs older than 14 days + VACUUM",
      schedule: events.Schedule.cron({ hour: "3", minute: "0" }),
      targets: [new eventsTargets.LambdaFunction(backendFn)],
    });

    // --- Scheduled Metrics Capture (hourly) ---

    new events.Rule(this, "MetricsCaptureSchedule", {
      ruleName: `${namePrefix}mysite-metrics-capture`,
      description: "Hourly database performance metrics snapshot",
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      targets: [new eventsTargets.LambdaFunction(backendFn, {
        event: events.RuleTargetInput.fromObject({
          source: "mysite.scheduled",
          action: "capture_metrics",
        }),
      })],
    });

    // --- API Gateway v2 ---

    // ACM cert for API subdomain (in the deployment region)
    const apiCert = new acm.Certificate(this, "ApiCertificate", {
      domainName: apiDomainName,
      validation: acm.CertificateValidation.fromDns(props.hostedZone),
    });

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: isStaging ? "mysite-stage-api" : "mysite-api",
      disableExecuteApiEndpoint: true,
      corsPreflight: {
        allowOrigins: [`https://${frontendDomain}`],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Admin-Key",
          "X-Regression-Key",
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Default route → Lambda
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        "LambdaIntegration",
        backendFn,
      ),
    });

    // API Gateway access logging
    const apiAccessLog = new logs.LogGroup(this, "ApiAccessLog", {
      logGroupName: `/mysite/${namePrefix}api-access`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: isStaging
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    // Throttling and access logging via stage
    const stage = httpApi.defaultStage?.node
      .defaultChild as apigatewayv2.CfnStage;
    stage.defaultRouteSettings = {
      throttlingRateLimit: config.apiThrottleRatePerSec,
      throttlingBurstLimit: config.apiThrottleBurst,
    };
    stage.accessLogSettings = {
      destinationArn: apiAccessLog.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        ip: "$context.identity.sourceIp",
        httpMethod: "$context.httpMethod",
        path: "$context.path",
        status: "$context.status",
        responseLength: "$context.responseLength",
        requestTime: "$context.requestTime",
        latency: "$context.integrationLatency",
      }),
    };

    // Custom domain for API
    const apiDomain = new apigatewayv2.DomainName(this, "ApiDomainName", {
      domainName: apiDomainName,
      certificate: apiCert,
    });

    new apigatewayv2.ApiMapping(this, "ApiMapping", {
      api: httpApi,
      domainName: apiDomain,
    });

    // --- Route 53 Records ---

    // Frontend: domain → CloudFront
    new route53.ARecord(this, "FrontendAliasRecord", {
      zone: props.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    // API: api.domain → API Gateway
    new route53.ARecord(this, "ApiAliasRecord", {
      zone: props.hostedZone,
      recordName: "api",
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          apiDomain.regionalDomainName,
          apiDomain.regionalHostedZoneId,
        ),
      ),
    });

    // --- Budget Alarm ---

    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: {
        budgetName: "mysite-monthly",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: config.budgetLimitUsd,
          unit: "USD",
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 80,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "EMAIL",
              address: config.budgetAlertEmail,
            },
          ],
        },
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              subscriptionType: "EMAIL",
              address: config.budgetAlertEmail,
            },
          ],
        },
      ],
    });

    // --- Outputs ---

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: `https://${apiDomainName}`,
    });

    new cdk.CfnOutput(this, "LambdaFunctionName", {
      value: backendFn.functionName,
    });

    new cdk.CfnOutput(this, "MediaBucketName", {
      value: mediaBucket.bucketName,
    });
  }
}
