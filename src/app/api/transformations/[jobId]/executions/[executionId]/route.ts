import { NextResponse } from "next/server";
import { getTransformationJob } from "@/lib/aws/transformation-db";
import { getExecutionDetail } from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  ExecutionDetailResponse,
  ExecutionHistoryEventResponse,
} from "@/lib/types/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; executionId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Decode params
    const { jobId: rawJobId, executionId: rawExecId } = await params;
    const jobId = decodeURIComponent(rawJobId);
    const executionId = decodeURIComponent(rawExecId);

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

    // 5. Reconstruct execution ARN from SFN ARN + execution name
    const arnParts = job.state_machine_arn.split(":");
    const region = arnParts[3];
    const accountId = arnParts[4];
    const sfnName = arnParts[6];
    const executionArn = `arn:aws:states:${region}:${accountId}:execution:${sfnName}:${executionId}`;

    // 6. Fetch execution detail
    const { detail, history } = await getExecutionDetail(executionArn);

    // 7. Build response
    const body: ExecutionDetailResponse = {
      executionArn: detail.executionArn,
      name: detail.name,
      status: detail.status,
      startDate: detail.startDate.toISOString(),
      stopDate: detail.stopDate?.toISOString() ?? null,
      input: detail.input ?? null,
      output: detail.output ?? null,
      error: detail.error ?? null,
      cause: detail.cause ?? null,
      stateMachineArn: detail.stateMachineArn,
      history: history.map(
        (ev): ExecutionHistoryEventResponse => ({
          id: ev.id,
          timestamp: ev.timestamp.toISOString(),
          type: ev.type,
          stateName: ev.stateName,
          error: ev.error,
          cause: ev.cause,
        })
      ),
    };

    return NextResponse.json(body);
  } catch (error) {
    return handleAwsError(error);
  }
}
