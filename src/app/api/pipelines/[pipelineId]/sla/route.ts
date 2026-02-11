import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import { getSlaConfig, putSlaConfig } from "@/lib/aws/sla-db";
import {
  requireAuth,
  isAdmin,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { SlaConfigResponse, SlaConfigUpdateRequest } from "@/lib/types/api";
import type { SlaConfig } from "@/lib/types/sla";

function defaultConfig(pipelineId: string): SlaConfigResponse {
  return {
    pipelineId,
    enabled: false,
    uptimeTargetPercent: 99.0,
    maxExecutionDurationSeconds: 3600,
    freshnessWindowMinutes: 120,
  };
}

function toResponse(config: SlaConfig): SlaConfigResponse {
  return {
    pipelineId: config.pipeline_id,
    enabled: config.enabled,
    uptimeTargetPercent: config.uptimeTargetPercent,
    maxExecutionDurationSeconds: config.maxExecutionDurationSeconds,
    freshnessWindowMinutes: config.freshnessWindowMinutes,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can manage SLA config" },
        { status: 403 }
      );
    }

    const { pipelineId: rawId } = await params;
    const pipelineId = decodeURIComponent(rawId);

    const pipeline = await getPipeline(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(pipeline.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    const config = await getSlaConfig(pipelineId);
    return NextResponse.json(config ? toResponse(config) : defaultConfig(pipelineId));
  } catch (error) {
    return handleAwsError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can manage SLA config" },
        { status: 403 }
      );
    }

    const { pipelineId: rawId } = await params;
    const pipelineId = decodeURIComponent(rawId);

    const pipeline = await getPipeline(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(pipeline.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as SlaConfigUpdateRequest;

    // Validate
    if (body.uptimeTargetPercent < 0 || body.uptimeTargetPercent > 100) {
      return NextResponse.json(
        { error: "Bad Request", message: "Uptime target must be between 0 and 100" },
        { status: 400 }
      );
    }
    if (body.maxExecutionDurationSeconds <= 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "Max execution duration must be greater than 0" },
        { status: 400 }
      );
    }
    if (body.freshnessWindowMinutes <= 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "Freshness window must be greater than 0" },
        { status: 400 }
      );
    }

    const config: SlaConfig = {
      pipeline_id: pipelineId,
      enabled: body.enabled,
      uptimeTargetPercent: body.uptimeTargetPercent,
      maxExecutionDurationSeconds: body.maxExecutionDurationSeconds,
      freshnessWindowMinutes: body.freshnessWindowMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.email ?? session.user.id ?? "unknown",
    };

    await putSlaConfig(config);

    return NextResponse.json(toResponse(config));
  } catch (error) {
    return handleAwsError(error);
  }
}
