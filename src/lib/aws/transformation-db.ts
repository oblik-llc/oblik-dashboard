import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "./client";
import type { TransformationJob } from "@/lib/types/transformation";
import { AwsServiceError } from "@/lib/types/pipeline";

const TRANSFORMATION_TABLE = "oblik-transformation-registry";

export async function listTransformationJobs(): Promise<TransformationJob[]> {
  const client = getDynamoDBClient();
  const jobs: TransformationJob[] = [];

  try {
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await client.send(
        new ScanCommand({
          TableName: TRANSFORMATION_TABLE,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      if (result.Items) {
        jobs.push(...(result.Items as TransformationJob[]));
      }

      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return jobs;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "Scan", error);
  }
}

export async function getTransformationJob(
  jobId: string
): Promise<TransformationJob | null> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new GetCommand({
        TableName: TRANSFORMATION_TABLE,
        Key: { job_id: jobId },
      })
    );

    return (result.Item as TransformationJob) ?? null;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "GetItem", error);
  }
}
