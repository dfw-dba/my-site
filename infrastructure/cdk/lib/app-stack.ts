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
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
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

    // --- Frontend: S3 + CloudFront ---

    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `${config.domainName}-frontend`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: [config.domainName],
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
      bucketName: `${config.domainName}-media`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: [`https://${config.domainName}`],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

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

    // Look up the DB secret created by RDS
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "DbSecret",
      "/mysite/db-credentials",
    );

    const repoRoot = path.resolve(__dirname, "..", "..", "..");

    const backendFn = new lambda.DockerImageFunction(this, "BackendFunction", {
      functionName: "mysite-backend",
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
      reservedConcurrentExecutions: config.lambdaConcurrency,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [lambdaSecurityGroup],
      environment: {
        COGNITO_USER_POOL_ID: props.userPoolId,
        COGNITO_APP_CLIENT_ID: props.userPoolClientId,
        COGNITO_REGION: config.awsRegion,
        CORS_ORIGINS: `https://${config.domainName}`,
        MEDIA_BUCKET: mediaBucket.bucketName,
        AWS_LWA_INVOKE_MODE: "BUFFERED",
      },
    });

    // Grant Lambda read access to DB credentials secret
    dbSecret.grantRead(backendFn);

    // Grant Lambda access to media bucket
    mediaBucket.grantReadWrite(backendFn);

    // --- API Gateway v2 ---

    const apiDomainName = `api.${config.domainName}`;

    // ACM cert for API subdomain (in the deployment region)
    const apiCert = new acm.Certificate(this, "ApiCertificate", {
      domainName: apiDomainName,
      validation: acm.CertificateValidation.fromDns(props.hostedZone),
    });

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: "mysite-api",
      corsPreflight: {
        allowOrigins: [`https://${config.domainName}`],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
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

    // Throttling via stage
    const stage = httpApi.defaultStage?.node
      .defaultChild as apigatewayv2.CfnStage;
    stage.defaultRouteSettings = {
      throttlingRateLimit: config.apiThrottleRatePerSec,
      throttlingBurstLimit: config.apiThrottleBurst,
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
