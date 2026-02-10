import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import {
  listExecutions,
  describeExecution,
} from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  getClientFilter,
  handleAwsError,
  computeDurationSeconds,
} from "@/lib/api/helpers";
import type {
  ExecutionRecordDataPoint,
  ExecutionRecordsResponse,
} from "@/lib/types/api";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const DESCRIBE_BATCH_SIZE = 10;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Decode pipeline ID
    const { pipelineId: rawId } = await params;
    const pipelineId = decodeURIComponent(rawId);

    // 3. Fetch pipeline from registry
    const pipeline = await getPipeline(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // 4. Multi-tenant check
    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(pipeline.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // 5. Parse query params
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    // 6. Fetch executions (paginate until we have enough non-RUNNING)
    const collected: Array<{
      executionArn: string;
      name: string;
      status: string;
      startDate: Date;
      stopDate?: Date;
    }> = [];

    let nextToken: string | undefined;
    while (collected.length < limit) {
      const result = await listExecutions(pipeline.state_machine_arn, {
        maxResults: Math.min(limit * 2, 100),
        nextToken,
      });

      for (const ex of result.executions) {
        if (ex.status === "RUNNING") continue;
        collected.push(ex);
        if (collected.length >= limit) break;
      }

      nextToken = result.nextToken;
      if (!nextToken) break;
    }

    // 7. Batch-describe executions to get output (sequential batches)
    const dataPoints: ExecutionRecordDataPoint[] = [];

    for (let i = 0; i < collected.length; i += DESCRIBE_BATCH_SIZE) {
      const batch = collected.slice(i, i + DESCRIBE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((ex) => describeExecution(ex.executionArn))
      );

      for (let j = 0; j < batch.length; j++) {
        const ex = batch[j];
        const result = results[j];

        let recordCount: number | null = null;
        if (result.status === "fulfilled" && result.value.output) {
          try {
            const parsed = JSON.parse(result.value.output);
            if (typeof parsed.recordCount === "number") {
              recordCount = parsed.recordCount;
            }
          } catch {
            // Output isn't valid JSON — that's fine
          }
        }

        dataPoints.push({
          executionName: ex.name,
          startDate: ex.startDate.toISOString(),
          stopDate: ex.stopDate?.toISOString() ?? null,
          status: ex.status,
          recordCount,
          durationSeconds: computeDurationSeconds(
            ex.startDate,
            ex.stopDate
          ),
        });
      }
    }

    // 8. Build response
    const body: ExecutionRecordsResponse = { dataPoints };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
