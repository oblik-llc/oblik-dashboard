import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "./client";
import type { Pipeline, SyncState } from "@/lib/types/pipeline";
import { AwsServiceError } from "@/lib/types/pipeline";

const PIPELINE_TABLE = "oblik-pipeline-registry";

export async function listPipelines(): Promise<Pipeline[]> {
  const client = getDynamoDBClient();
  const pipelines: Pipeline[] = [];

  try {
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await client.send(
        new ScanCommand({
          TableName: PIPELINE_TABLE,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );

      if (result.Items) {
        pipelines.push(...(result.Items as Pipeline[]));
      }

      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return pipelines;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "Scan", error);
  }
}

export async function getPipeline(
  pipelineId: string
): Promise<Pipeline | null> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new GetCommand({
        TableName: PIPELINE_TABLE,
        Key: { pipeline_id: pipelineId },
      })
    );

    return (result.Item as Pipeline) ?? null;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "GetItem", error);
  }
}

export async function getSyncState(
  tableName: string,
  clientConnector: string
): Promise<SyncState | null> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { client_connector: clientConnector },
      })
    );

    return (result.Item as SyncState) ?? null;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "GetItem", error);
  }
}
