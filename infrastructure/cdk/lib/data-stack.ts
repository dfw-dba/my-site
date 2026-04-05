import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cr from "aws-cdk-lib/custom-resources";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { config } from "../config";

interface DataStackProps extends cdk.StackProps {
  hostedZone: route53.IHostedZone;
}

export class DataStack extends cdk.Stack {
  public readonly database: rds.IDatabaseInstance;
  public readonly databaseSecurityGroup: ec2.ISecurityGroup;
  public readonly vpc: ec2.IVpc;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly bastionSecurityGroup: ec2.ISecurityGroup;
  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const isStaging = config.isStaging;
    const ssmPrefix = "/mysite";

    // Use default VPC to avoid NAT Gateway costs
    this.vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    // --- RDS PostgreSQL ---

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for RDS PostgreSQL",
      allowAllOutbound: false,
    });

    const dbCredentials = rds.Credentials.fromGeneratedSecret("mysite", {
      secretName: `${ssmPrefix}/db-credentials`,
    });

    const dbInstance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      publiclyAccessible: false,
      securityGroups: [this.databaseSecurityGroup],
      credentials: dbCredentials,
      databaseName: "mysite",
      allocatedStorage: 20,
      maxAllocatedStorage: 20,
      multiAz: false,
      backupRetention: isStaging ? cdk.Duration.days(1) : cdk.Duration.days(30),
      iamAuthentication: true,
      deletionProtection: !isStaging,
      removalPolicy: isStaging ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      storageEncrypted: true,
      parameterGroup: new rds.ParameterGroup(this, "DbParams", {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_17,
        }),
        parameters: {
          "rds.force_ssl": "1",
          "shared_preload_libraries": "pg_stat_statements,auto_explain",
          "pg_stat_statements.track": "all",
          "track_functions": "all",
          "auto_explain.log_min_duration": "500",
          "auto_explain.log_analyze": "true",
          "auto_explain.log_buffers": "true",
          "auto_explain.log_format": "json",
        },
      }),
    });

    this.database = dbInstance;

    // --- Database Migration Custom Resource ---

    const migrationSg = new ec2.SecurityGroup(this, "MigrationLambdaSg", {
      vpc: this.vpc,
      description: "Security group for DB migration Lambda",
      allowAllOutbound: true,
    });

    this.databaseSecurityGroup.addIngressRule(
      migrationSg,
      ec2.Port.tcp(5432),
      "Allow migration Lambda to connect to RDS",
    );

    const migrationFn = new lambda.Function(this, "DbMigrationFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "migration-handler"),
        {
          assetHashType: cdk.AssetHashType.OUTPUT,
          bundling: {
            image: lambda.Runtime.PYTHON_3_12.bundlingImage,
            volumes: [
              {
                hostPath: path.resolve(__dirname, "../../../database/init"),
                containerPath: "/sql-input",
              },
              {
                hostPath: path.resolve(__dirname, "../../../database/migrations"),
                containerPath: "/migrations-input",
              },
            ],
            command: [
              "bash",
              "-c",
              "pip install pg8000 -t /asset-output && cp /asset-input/*.py /asset-output/ && mkdir -p /asset-output/sql && cp /sql-input/*.sql /asset-output/sql/ && mkdir -p /asset-output/migrations && cp /migrations-input/*.sql /asset-output/migrations/",
            ],
          },
        },
      ),
      vpc: this.vpc,
      // Public subnet avoids NAT Gateway cost (~$32/mo per AZ). Migration
      // Lambda needs outbound access only for Secrets Manager (via VPC
      // endpoint) and does not accept inbound connections from the internet.
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [migrationSg],
      timeout: cdk.Duration.minutes(5),
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_USER: dbCredentials.username,
        DB_SECRET_ARN: dbInstance.secret!.secretArn,
        DB_NAME: "mysite",
      },
    });

    // Grant migration Lambda read access to the database secret
    dbInstance.secret!.grantRead(migrationFn);

    const migrationProvider = new cr.Provider(this, "DbMigrationProvider", {
      onEventHandler: migrationFn,
    });

    const dbMigration = new cdk.CustomResource(this, "DbMigration", {
      serviceToken: migrationProvider.serviceToken,
      properties: {
        // Change this value to trigger the migration again on next deploy
        version: "19",
      },
    });

    // Migration Lambda must wait for Secrets Manager VPC endpoint
    // (defined later in this file — dependency added after endpoint creation)

    // Store database URL in SSM (uses the generated secret)
    new ssm.StringParameter(this, "DbEndpointParam", {
      parameterName: `${ssmPrefix}/db-endpoint`,
      stringValue: dbInstance.dbInstanceEndpointAddress,
    });

    new ssm.StringParameter(this, "DbPortParam", {
      parameterName: `${ssmPrefix}/db-port`,
      stringValue: dbInstance.dbInstanceEndpointPort,
    });

    // --- Outputs ---

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: dbInstance.dbInstanceEndpointAddress,
    });

    // --- Cognito User Pool ---

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "mysite-users",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      deletionProtection: true,
      removalPolicy: isStaging ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient("SpaClient", {
      userPoolClientName: "mysite-spa",
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(5),
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;

    // Store Cognito IDs in SSM
    new ssm.StringParameter(this, "CognitoPoolIdParam", {
      parameterName: `${ssmPrefix}/cognito-pool-id`,
      stringValue: userPool.userPoolId,
    });

    new ssm.StringParameter(this, "CognitoClientIdParam", {
      parameterName: `${ssmPrefix}/cognito-client-id`,
      stringValue: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    // --- VPC Endpoint for Secrets Manager (migration Lambda fetches DB password) ---

    const secretsManagerEndpoint = new ec2.InterfaceVpcEndpoint(this, "SecretsManagerEndpoint", {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
      subnets: {
        availabilityZones: [
          `${config.awsRegion}b`,
          `${config.awsRegion}c`,
        ],
      },
    });

    // Ensure migration runs only after Secrets Manager endpoint is available
    dbMigration.node.addDependency(secretsManagerEndpoint);

    // --- VPC Endpoint for Cognito (Lambda in VPC needs this for JWKS) ---

    new ec2.InterfaceVpcEndpoint(this, "CognitoEndpoint", {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.COGNITO_IDP,
      privateDnsEnabled: true,
      subnets: {
        availabilityZones: [
          `${config.awsRegion}b`,
          `${config.awsRegion}c`,
        ],
      },
    });

    // --- VPC Endpoint for S3 (Lambda in VPC needs this for media uploads) ---

    this.vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // --- Bastion Host (SSM Session Manager, no SSH keys) ---

    const bastionSg = new ec2.SecurityGroup(this, "BastionSg", {
      vpc: this.vpc,
      description: "Bastion host - outbound only for SSM",
      allowAllOutbound: true,
    });

    this.databaseSecurityGroup.addIngressRule(
      bastionSg,
      ec2.Port.tcp(5432),
      "Allow bastion host to connect to RDS",
    );

    const bastionRole = new iam.Role(this, "BastionRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    });

    // Pin to AZs b/c to avoid us-east-1a intermittent t4g.nano capacity issues.
    // Aligned with VPC endpoint AZs for consistency.
    const bastion = new ec2.Instance(this, "Bastion", {
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        availabilityZones: [
          `${config.awsRegion}b`,
          `${config.awsRegion}c`,
        ],
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.NANO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
        cachedInContext: true,
      }),
      securityGroup: bastionSg,
      role: bastionRole,
    });

    bastion.addUserData("dnf install -y postgresql16");

    this.bastionSecurityGroup = bastionSg;

    new cdk.CfnOutput(this, "BastionInstanceId", {
      value: bastion.instanceId,
    });

    // --- GeoIP Auto-Update (ECS Fargate + EventBridge) ---

    const geoipLogGroup = new logs.LogGroup(this, "GeoipUpdateLogGroup", {
      logGroupName: "/mysite/geoip-update",
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const geoipCluster = new ecs.Cluster(this, "GeoipCluster", {
      vpc: this.vpc,
      clusterName: `mysite-geoip${isStaging ? "-stage" : ""}`,
    });

    const geoipTaskDef = new ecs.FargateTaskDefinition(this, "GeoipTaskDef", {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const maxmindSecret = new secretsmanager.Secret(this, "MaxMindSecret", {
      secretName: `${ssmPrefix}/maxmind-credentials`,
      description: "MaxMind GeoLite2 account_id and license_key for automated GeoIP updates",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ account_id: "", license_key: "" }),
        generateStringKey: "_placeholder",
      },
    });

    // Grant task role read access to both secrets
    dbInstance.secret!.grantRead(geoipTaskDef.taskRole);
    maxmindSecret.grantRead(geoipTaskDef.taskRole);

    geoipTaskDef.addContainer("geoip-update", {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, "../../../docker/geoip-update"),
      ),
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_USER: dbCredentials.username,
        DB_NAME: "mysite",
        DB_SECRET_ARN: dbInstance.secret!.secretArn,
        MAXMIND_SECRET_ARN: maxmindSecret.secretArn,
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup: geoipLogGroup,
        streamPrefix: "geoip",
      }),
    });

    const geoipSg = new ec2.SecurityGroup(this, "GeoipTaskSg", {
      vpc: this.vpc,
      description: "GeoIP update Fargate task - internet and RDS access",
      allowAllOutbound: true,
    });

    this.databaseSecurityGroup.addIngressRule(
      geoipSg,
      ec2.Port.tcp(5432),
      "Allow GeoIP update task to connect to RDS",
    );

    // Schedule: Wed + Sat at 06:00 UTC (MaxMind updates Tue + Fri)
    new events.Rule(this, "GeoipScheduleRule", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "6",
        weekDay: "WED,SAT",
      }),
      targets: [
        new targets.EcsTask({
          cluster: geoipCluster,
          taskDefinition: geoipTaskDef,
          subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
          assignPublicIp: true,
          securityGroups: [geoipSg],
        }),
      ],
    });

  }
}
