import { NextResponse } from "next/server";
import { getTransformationJob } from "@/lib/aws/transformation-db";
import { listExecutions } from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  ExecutionSummaryResponse,
  ExecutionsListResponse,
} from "@/lib/types/api";
import type { ExecutionSummary } from "@/lib/types/pipeline";

const VALID_STATUSES = new Set([
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "TIMED_OUT",
  "ABORTED",
]);

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
    const statusParam = url.searchParams.get("status") ?? undefined;
    const nextTokenParam = url.searchParams.get("nextToken") ?? undefined;

    const statusFilter =
      statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined;

    // 6. Fetch executions
    const result = await listExecutions(job.state_machine_arn, {
      statusFilter,
      maxResults: 20,
      nextToken: nextTokenParam,
    });

    // 7. Build response
    const body: ExecutionsListResponse = {
      executions: result.executions.map(serializeExecution),
      nextToken: result.nextToken ?? null,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=10, stale-while-revalidate=20",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}

function serializeExecution(exec: ExecutionSummary): ExecutionSummaryResponse {
  return {
    executionArn: exec.executionArn,
    name: exec.name,
    status: exec.status,
    startDate: exec.startDate.toISOString(),
    stopDate: exec.stopDate?.toISOString() ?? null,
  };
}
