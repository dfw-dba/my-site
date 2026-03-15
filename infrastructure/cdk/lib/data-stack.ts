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
  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // Use default VPC to avoid NAT Gateway costs
    this.vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    // --- RDS PostgreSQL ---

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for RDS PostgreSQL",
      allowAllOutbound: false,
    });

    const dbCredentials = rds.Credentials.fromGeneratedSecret("mysite", {
      secretName: "/mysite/db-credentials",
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
      backupRetention: cdk.Duration.days(30),
      iamAuthentication: true,
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      storageEncrypted: true,
      parameterGroup: new rds.ParameterGroup(this, "DbParams", {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_17,
        }),
        parameters: {
          "rds.force_ssl": "1",
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
          bundling: {
            image: lambda.Runtime.PYTHON_3_12.bundlingImage,
            volumes: [
              {
                hostPath: path.resolve(__dirname, "../../../database/init"),
                containerPath: "/sql-input",
              },
            ],
            command: [
              "bash",
              "-c",
              "pip install pg8000 -t /asset-output && cp /asset-input/*.py /asset-output/ && mkdir -p /asset-output/sql && cp /sql-input/*.sql /asset-output/sql/",
            ],
          },
        },
      ),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [migrationSg],
      timeout: cdk.Duration.minutes(2),
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: dbInstance.dbInstanceEndpointPort,
        DB_USER: dbCredentials.username,
        DB_PASSWORD: dbInstance.secret!
          .secretValueFromJson("password")
          .unsafeUnwrap(),
        DB_NAME: "mysite",
      },
    });

    const migrationProvider = new cr.Provider(this, "DbMigrationProvider", {
      onEventHandler: migrationFn,
    });

    new cdk.CustomResource(this, "DbMigration", {
      serviceToken: migrationProvider.serviceToken,
      properties: {
        // Change this value to trigger the migration again on next deploy
        version: "2",
      },
    });

    // Store database URL in SSM (uses the generated secret)
    new ssm.StringParameter(this, "DbEndpointParam", {
      parameterName: "/mysite/db-endpoint",
      stringValue: dbInstance.dbInstanceEndpointAddress,
    });

    new ssm.StringParameter(this, "DbPortParam", {
      parameterName: "/mysite/db-port",
      stringValue: dbInstance.dbInstanceEndpointPort,
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
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient("SpaClient", {
      userPoolClientName: "mysite-spa",
      authFlows: {
        userSrp: true,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;

    // Store Cognito IDs in SSM
    new ssm.StringParameter(this, "CognitoPoolIdParam", {
      parameterName: "/mysite/cognito-pool-id",
      stringValue: userPool.userPoolId,
    });

    new ssm.StringParameter(this, "CognitoClientIdParam", {
      parameterName: "/mysite/cognito-client-id",
      stringValue: userPoolClient.userPoolClientId,
    });

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

    const bastion = new ec2.Instance(this, "Bastion", {
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.NANO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: bastionSg,
      role: bastionRole,
    });

    bastion.addUserData("dnf install -y postgresql16");

    // --- Outputs ---

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: dbInstance.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "BastionInstanceId", {
      value: bastion.instanceId,
    });

  }
}
