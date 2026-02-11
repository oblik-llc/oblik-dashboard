import { NextResponse } from "next/server";
import { listPipelines } from "@/lib/aws/dynamodb";
import { computePipelineAnalytics } from "@/lib/aws/analytics";
import {
  requireAuth,
  getClientFilter,
  filterPipelinesByClient,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  AnalyticsPeriod,
  AnalyticsSummaryPipeline,
  AnalyticsSummaryResponse,
} from "@/lib/types/api";

const VALID_PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d"];

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    const url = new URL(request.url);
    const period = (url.searchParams.get("period") ?? "30d") as AnalyticsPeriod;
    if (!VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Period must be 7d, 30d, or 90d" },
        { status: 400 }
      );
    }

    const allPipelines = await listPipelines();
    const allowedClients = getClientFilter(session.user.groups);
    const pipelines = filterPipelinesByClient(allPipelines, allowedClients);

    // Compute analytics for all pipelines in parallel
    const results = await Promise.allSettled(
      pipelines.map((p) => computePipelineAnalytics(p, period))
    );

    const summaryPipelines: AnalyticsSummaryPipeline[] = [];
    let totalRecordsSynced = 0;
    let totalExecutions = 0;
    let uptimeSum = 0;
    let slaCompliantCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== "fulfilled") continue;

      const a = result.value;
      const pipeline = pipelines[i];

      const slaCompliant =
        a.slaConfig?.enabled
          ? a.uptimePercent >= a.slaConfig.uptimeTargetPercent &&
            (a.freshnessPercent === null || a.freshnessPercent >= 100)
          : true; // No SLA configured = compliant by default

      summaryPipelines.push({
        pipelineId: a.pipelineId,
        clientName: pipeline.client_name,
        uptimePercent: a.uptimePercent,
        freshnessPercent: a.freshnessPercent,
        totalRecordsSynced: a.totalRecordsSynced,
        totalExecutions: a.totalExecutions,
        slaCompliant,
      });

      totalRecordsSynced += a.totalRecordsSynced;
      totalExecutions += a.totalExecutions;
      uptimeSum += a.uptimePercent;
      if (slaCompliant) slaCompliantCount++;
    }

    const overallUptimePercent =
      summaryPipelines.length > 0
        ? Math.round((uptimeSum / summaryPipelines.length) * 100) / 100
        : 100;

    const response: AnalyticsSummaryResponse = {
      pipelines: summaryPipelines,
      totals: {
        totalPipelines: summaryPipelines.length,
        slaCompliantCount,
        overallUptimePercent,
        totalRecordsSynced,
        totalExecutions,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
