/**
 * Site configuration — edit these values for your deployment.
 *
 * To deploy your own instance:
 * 1. Change domainName to your domain
 * 2. Set awsAccountId to your AWS account ID
 * 3. Set budgetAlertEmail to your email address
 * 4. Optionally adjust region, instance class, and limits
 */
export const config = {
  /** Your domain name (must be registered — you'll point NS records to Route 53) */
  domainName: "jasonrowland.me",

  /** AWS account ID for deployment */
  awsAccountId: "123456789012",

  /** Primary AWS region for all resources */
  awsRegion: "us-east-1",

  /** RDS instance class (t4g.micro = free tier eligible) */
  dbInstanceClass: "t4g.micro",

  /** Lambda memory in MB */
  lambdaMemoryMb: 256,

  /** Lambda reserved concurrency (caps simultaneous executions) */
  lambdaConcurrency: 5,

  /** API Gateway throttle: sustained requests per second */
  apiThrottleRatePerSec: 10,

  /** API Gateway throttle: burst capacity */
  apiThrottleBurst: 50,

  /** Monthly budget alarm threshold in USD */
  budgetLimitUsd: 10,

  /** Email address for budget alarm notifications */
  budgetAlertEmail: "you@example.com",
};
