import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import { queryAlertHistory } from "@/lib/aws/alerts-db";
import {
  requireAuth,
  isAdmin,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { AlertHistoryResponse } from "@/lib/types/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can view alert history" },
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

    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
      100
    );

    const { entries } = await queryAlertHistory(pipelineId, { limit });

    const response: AlertHistoryResponse = {
      entries: entries.map((e) => ({
        sentAt: e.sent_at,
        alertType: e.alertType,
        channel: e.channel,
        success: e.success,
        errorMessage: e.errorMessage,
        message: e.message,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleAwsError(error);
  }
}
