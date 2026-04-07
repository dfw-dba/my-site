/**
 * Site configuration.
 *
 * Required environment variables (set in shell or .env):
 *   CDK_DOMAIN_NAME     — your registered domain (e.g., "example.com")
 *   CDK_ACCOUNT_ID      — AWS account ID (or use AWS_ACCOUNT_ID)
 *   CDK_REGION           — AWS region (or use AWS_REGION, default: us-east-1)
 *   CDK_BUDGET_EMAIL     — email for budget alarm notifications
 *
 * Optional environment variables (sensible defaults provided):
 *   CDK_DB_INSTANCE_CLASS, CDK_LAMBDA_MEMORY_MB,
 *   CDK_API_THROTTLE_RATE, CDK_API_THROTTLE_BURST, CDK_BUDGET_LIMIT_USD
 *
 * Feature toggles are in features.json (per-environment, checked into repo).
 */

import * as fs from "fs";
import * as path from "path";

interface FeatureToggles {
  databaseInsightsAdvanced: boolean;
}

interface FeaturesConfig {
  staging: FeatureToggles;
  production: FeatureToggles;
}

function loadFeatures(): FeatureToggles {
  const raw = fs.readFileSync(
    path.join(__dirname, "features.json"),
    "utf-8",
  );
  const all: FeaturesConfig = JSON.parse(raw);
  const env = process.env.CDK_IS_STAGING === "true" ? "staging" : "production";
  return all[env];
}

function required(name: string, ...fallbacks: string[]): string {
  const value = [name, ...fallbacks]
    .map((n) => process.env[n])
    .find((v) => v !== undefined && v !== "");
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}` +
        (fallbacks.length ? ` (also checked: ${fallbacks.join(", ")})` : ""),
    );
  }
  return value;
}

function optional(name: string, defaultValue: string, ...fallbacks: string[]): string {
  return (
    [name, ...fallbacks]
      .map((n) => process.env[n])
      .find((v) => v !== undefined && v !== "") ?? defaultValue
  );
}

export const config = {
  domainName: required("CDK_DOMAIN_NAME"),
  awsAccountId: required("CDK_ACCOUNT_ID", "AWS_ACCOUNT_ID"),
  awsRegion: optional("CDK_REGION", "us-east-1", "AWS_REGION"),
  dbInstanceClass: optional("CDK_DB_INSTANCE_CLASS", "t4g.micro"),
  lambdaMemoryMb: Number(optional("CDK_LAMBDA_MEMORY_MB", "256")),
  apiThrottleRatePerSec: Number(optional("CDK_API_THROTTLE_RATE", "10")),
  apiThrottleBurst: Number(optional("CDK_API_THROTTLE_BURST", "50")),
  budgetLimitUsd: Number(optional("CDK_BUDGET_LIMIT_USD", "10")),
  budgetAlertEmail: required("CDK_BUDGET_EMAIL"),
  isStaging: process.env.CDK_IS_STAGING === "true",
  autoGenerateBucketNames: optional("CDK_AUTO_BUCKET_NAMES", "true") === "true",
  features: loadFeatures(),
};
