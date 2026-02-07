import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SFNClient } from "@aws-sdk/client-sfn";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
};

// Lazy singletons — created on first use, reused across requests
// within a single serverless function instance

let dynamoDBClient: DynamoDBDocumentClient | null = null;
let sfnClient: SFNClient | null = null;
let cloudWatchClient: CloudWatchClient | null = null;
let cloudWatchLogsClient: CloudWatchLogsClient | null = null;

export function getDynamoDBClient(): DynamoDBDocumentClient {
  if (!dynamoDBClient) {
    const baseClient = new DynamoDBClient(awsConfig);
    dynamoDBClient = DynamoDBDocumentClient.from(baseClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return dynamoDBClient;
}

export function getSFNClient(): SFNClient {
  if (!sfnClient) {
    sfnClient = new SFNClient(awsConfig);
  }
  return sfnClient;
}

export function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient(awsConfig);
  }
  return cloudWatchClient;
}

export function getCloudWatchLogsClient(): CloudWatchLogsClient {
  if (!cloudWatchLogsClient) {
    cloudWatchLogsClient = new CloudWatchLogsClient(awsConfig);
  }
  return cloudWatchLogsClient;
}
