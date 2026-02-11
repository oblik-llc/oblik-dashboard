import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "./client";
import type { SlaConfig } from "@/lib/types/sla";
import { AwsServiceError } from "@/lib/types/pipeline";

const TABLE = "oblik-sla-config";

export async function getSlaConfig(
  pipelineId: string
): Promise<SlaConfig | null> {
  const client = getDynamoDBClient();

  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE,
        Key: { pipeline_id: pipelineId },
      })
    );

    return (result.Item as SlaConfig) ?? null;
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "GetItem", error);
  }
}

export async function putSlaConfig(config: SlaConfig): Promise<void> {
  const client = getDynamoDBClient();

  try {
    await client.send(
      new PutCommand({
        TableName: TABLE,
        Item: config,
      })
    );
  } catch (error) {
    throw new AwsServiceError("DynamoDB", "PutItem", error);
  }
}
