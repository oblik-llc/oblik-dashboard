import { FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { getCloudWatchLogsClient } from "./client";
import type { LogQueryResult } from "@/lib/types/pipeline";
import { AwsServiceError } from "@/lib/types/pipeline";

export async function getLogs(
  logGroup: string,
  startTime: number,
  endTime: number,
  filterPattern?: string,
  nextToken?: string,
  limit: number = 100
): Promise<LogQueryResult> {
  const client = getCloudWatchLogsClient();

  try {
    const result = await client.send(
      new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime,
        endTime,
        filterPattern,
        nextToken,
        limit,
      })
    );

    const events = (result.events ?? []).map((ev) => ({
      timestamp: ev.timestamp!,
      message: ev.message!,
      ingestionTime: ev.ingestionTime,
      eventId: ev.eventId,
    }));

    return { events, nextToken: result.nextToken };
  } catch (error) {
    throw new AwsServiceError("CloudWatchLogs", "FilterLogEvents", error);
  }
}
