import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
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
import type {
  ExecutionDetail,
  ExecutionHistoryEvent,
} from "@/lib/types/pipeline";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ pipelineId: string; executionId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Decode params
    const { pipelineId: rawPipelineId, executionId: rawExecutionId } =
      await params;
    const pipelineId = decodeURIComponent(rawPipelineId);
    const executionId = decodeURIComponent(rawExecutionId);

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

    // 5. Reconstruct execution ARN from pipeline's state machine ARN
    const executionArn =
      pipeline.state_machine_arn.replace(":stateMachine:", ":execution:") +
      ":" +
      executionId;

    // 6. Fetch execution detail + history
    const { detail, history } = await getExecutionDetail(executionArn);

    // 7. Build response
    const body: ExecutionDetailResponse = {
      ...serializeDetail(detail),
      history: history.map(serializeHistoryEvent),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}

function serializeDetail(
  detail: ExecutionDetail
): Omit<ExecutionDetailResponse, "history"> {
  return {
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
  };
}

function serializeHistoryEvent(
  event: ExecutionHistoryEvent
): ExecutionHistoryEventResponse {
  return {
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    type: event.type,
    ...(event.stateName && { stateName: event.stateName }),
    ...(event.error && { error: event.error }),
    ...(event.cause && { cause: event.cause }),
  };
}
