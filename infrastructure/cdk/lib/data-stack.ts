import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ecr from "aws-cdk-lib/aws-ecr";
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
  public readonly ecrRepository: ecr.IRepository;

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
      backupRetention: cdk.Duration.days(7),
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
    });

    // --- ECR Repository ---

    this.ecrRepository = new ecr.Repository(this, "BackendRepo", {
      repositoryName: "mysite-backend",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 5,
          description: "Keep only 5 most recent images",
        },
      ],
    });

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

    new cdk.CfnOutput(this, "EcrRepoUri", {
      value: this.ecrRepository.repositoryUri,
    });
  }
}
