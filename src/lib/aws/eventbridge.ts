import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { getEventBridgeClient } from "./client";
import { AwsServiceError } from "@/lib/types/pipeline";

export async function triggerTransformationJob(
  clientId: string,
  jobNames: string[],
  triggeredBy: string
): Promise<void> {
  const client = getEventBridgeClient();

  try {
    await client.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "oblik.manual-trigger",
            DetailType: "Run Jobs",
            Detail: JSON.stringify({
              client_id: clientId,
              job_names: jobNames,
              triggered_by: triggeredBy,
              triggered_at: new Date().toISOString(),
              source: "dashboard",
            }),
          },
        ],
      })
    );
  } catch (error) {
    throw new AwsServiceError("EventBridge", "PutEvents", error);
  }
}
