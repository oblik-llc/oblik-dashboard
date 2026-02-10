import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "./client";
import type { AlertPreferences, AlertHistoryEntry } from "@/lib/types/alerts";
import { AwsServiceError } from "@/lib/types/pipeline";

const PREFERENCES_TABLE = "oblik-alert-preferences";
const HISTORY_TABLE = "oblik-alert-history";

export async function getAlertPreferences(
  pipelineId: string
): Promise<AlertPreferences | null> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new GetCommand({
        TableName: PREFERENCES_TABLE,
        Key: { pipeline_id: pipelineId },
      })
    );

    return (result.Item as AlertPreferences) ?? null;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "GetItem", error);
  }
}

export async function putAlertPreferences(
  prefs: AlertPreferences
): Promise<void> {
  const client = getDynamoDBClient();

  try {
    await client.send(
      new PutCommand({
        TableName: PREFERENCES_TABLE,
        Item: prefs,
      })
    );
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "PutItem", error);
  }
}

export async function putAlertHistoryEntry(
  entry: AlertHistoryEntry
): Promise<void> {
  const client = getDynamoDBClient();

  try {
    await client.send(
      new PutCommand({
        TableName: HISTORY_TABLE,
        Item: entry,
      })
    );
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "PutItem", error);
  }
}

export async function queryAlertHistory(
  pipelineId: string,
  opts?: { limit?: number; exclusiveStartKey?: Record<string, unknown> }
): Promise<{
  entries: AlertHistoryEntry[];
  lastEvaluatedKey?: Record<string, unknown>;
}> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: HISTORY_TABLE,
        KeyConditionExpression: "pipeline_id = :pid",
        ExpressionAttributeValues: { ":pid": pipelineId },
        ScanIndexForward: false, // newest first
        Limit: opts?.limit ?? 50,
        ExclusiveStartKey: opts?.exclusiveStartKey,
      })
    );

    return {
      entries: (result.Items as AlertHistoryEntry[]) ?? [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "Query", error);
  }
}

export async function getLastAlertTime(
  pipelineId: string
): Promise<string | null> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: HISTORY_TABLE,
        KeyConditionExpression: "pipeline_id = :pid",
        ExpressionAttributeValues: { ":pid": pipelineId },
        ScanIndexForward: false,
        Limit: 1,
        ProjectionExpression: "sent_at",
      })
    );

    if (result.Items && result.Items.length > 0) {
      return (result.Items[0] as { sent_at: string }).sent_at;
    }
    return null;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "Query", error);
  }
}
