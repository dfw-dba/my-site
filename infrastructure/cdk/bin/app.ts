#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { config } from "../config";
import { DnsStack } from "../lib/dns-stack";
import { CertStack } from "../lib/cert-stack";
import { DataStack } from "../lib/data-stack";
import { AppStack } from "../lib/app-stack";

const app = new cdk.App();

const env = {
  account: config.awsAccountId,
  region: config.awsRegion,
};

const dns = new DnsStack(app, "MySiteDns", { env });

const cert = new CertStack(app, "MySiteCert", {
  env: { account: config.awsAccountId, region: "us-east-1" },
  crossRegionReferences: true,
  hostedZone: dns.hostedZone,
});

const data = new DataStack(app, "MySiteData", {
  env,
  hostedZone: dns.hostedZone,
});

new AppStack(app, "MySiteApp", {
  env,
  crossRegionReferences: true,
  hostedZone: dns.hostedZone,
  certificate: cert.certificate,
  database: data.database,
  databaseSecurityGroup: data.databaseSecurityGroup,
  vpc: data.vpc,
  userPoolId: data.userPoolId,
  userPoolClientId: data.userPoolClientId,
  geoipTriggerBucket: data.geoipTriggerBucket,
});

app.synth();
