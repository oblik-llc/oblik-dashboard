import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import { computePipelineAnalytics } from "@/lib/aws/analytics";
import {
  requireAuth,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { AnalyticsPeriod } from "@/lib/types/api";

const VALID_PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

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
    const period = (url.searchParams.get("period") ?? "30d") as AnalyticsPeriod;
    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Period must be 7d, 30d, or 90d" },
        { status: 400 }
      );
    }

    const analytics = await computePipelineAnalytics(pipeline, period);

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
