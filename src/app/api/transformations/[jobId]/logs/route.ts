import { NextResponse } from "next/server";
import { getTransformationJob } from "@/lib/aws/transformation-db";
import { getLogs } from "@/lib/aws/logs";
import {
  requireAuth,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { LogsResponse, LogEventResponse } from "@/lib/types/api";

const VALID_LOG_GROUPS = new Set(["ecs", "sfn"]);
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Decode job ID
    const { jobId: rawId } = await params;
    const jobId = decodeURIComponent(rawId);

    // 3. Fetch job from registry
    const job = await getTransformationJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Not Found", message: "Transformation job not found" },
        { status: 404 }
      );
    }

    // 4. Multi-tenant check
    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(job.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Transformation job not found" },
        { status: 404 }
      );
    }

    // 5. Parse query params
    const url = new URL(request.url);
    const logGroup = url.searchParams.get("logGroup");
    const startTimeParam = url.searchParams.get("startTime");
    const endTimeParam = url.searchParams.get("endTime");
    const filter = url.searchParams.get("filter") || undefined;
    const nextToken = url.searchParams.get("nextToken") || undefined;
    const limitParam = url.searchParams.get("limit");

    // 6. Validate required params
    if (!logGroup || !VALID_LOG_GROUPS.has(logGroup)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: 'logGroup is required and must be "ecs" or "sfn"',
        },
        { status: 400 }
      );
    }

    if (!startTimeParam || !endTimeParam) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "startTime and endTime are required (ISO 8601)",
        },
        { status: 400 }
      );
    }

    const startTime = new Date(startTimeParam).getTime();
    const endTime = new Date(endTimeParam).getTime();

    if (isNaN(startTime) || isNaN(endTime)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "startTime and endTime must be valid ISO 8601 dates",
        },
        { status: 400 }
      );
    }

    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT), MAX_LIMIT)
      : DEFAULT_LIMIT;

    // 7. Resolve log group name
    const logGroupName =
      logGroup === "ecs" ? job.ecs_log_group : job.sfn_log_group;

    if (!logGroupName) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: `No ${logGroup} log group configured for this job`,
        },
        { status: 404 }
      );
    }

    // 8. Fetch logs
    const result = await getLogs(
      logGroupName,
      startTime,
      endTime,
      filter,
      nextToken,
      limit
    );

    // 9. Build response
    const events: LogEventResponse[] = result.events.map((ev) => ({
      timestamp: new Date(ev.timestamp).toISOString(),
      message: ev.message,
      ingestionTime: ev.ingestionTime
        ? new Date(ev.ingestionTime).toISOString()
        : null,
      eventId: ev.eventId ?? null,
    }));

    const body: LogsResponse = {
      events,
      nextToken: result.nextToken ?? null,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
