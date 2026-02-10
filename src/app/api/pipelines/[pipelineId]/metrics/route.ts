import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import { getMetrics } from "@/lib/aws/cloudwatch";
import {
  requireAuth,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { MetricPeriod, MetricDataPoint } from "@/lib/types/pipeline";
import type { PipelineMetricsResponse, MetricDataPointResponse } from "@/lib/types/api";

const VALID_PERIODS = new Set<MetricPeriod>(["1h", "6h", "24h", "7d", "30d"]);

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
    const periodParam = url.searchParams.get("period") as MetricPeriod | null;
    const period: MetricPeriod =
      periodParam && VALID_PERIODS.has(periodParam) ? periodParam : "7d";

    // 6. Fetch metrics
    const metrics = await getMetrics(pipeline.state_machine_arn, period);

    // 7. Build response
    const body: PipelineMetricsResponse = {
      executionsSucceeded: serializeDataPoints(metrics.executionsSucceeded),
      executionsFailed: serializeDataPoints(metrics.executionsFailed),
      executionsStarted: serializeDataPoints(metrics.executionsStarted),
      executionTime: serializeDataPoints(metrics.executionTime),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}

function serializeDataPoints(
  points: MetricDataPoint[]
): MetricDataPointResponse[] {
  return points.map((p) => ({
    timestamp: p.timestamp.toISOString(),
    value: p.value,
  }));
}
