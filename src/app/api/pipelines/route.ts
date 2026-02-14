import { NextResponse } from "next/server";
import { listPipelines } from "@/lib/aws/dynamodb";
import {
  isCurrentlyRunning,
  listExecutions,
} from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  getClientFilter,
  filterPipelinesByClient,
  computeStatus,
  computeSuccessRate,
  buildLastSync,
  handleAwsError,
} from "@/lib/api/helpers";
import { parseScheduleIntervalMinutes } from "@/lib/aws/analytics";
import type { PipelineOverview, PipelinesListResponse } from "@/lib/types/api";

export async function GET() {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Fetch all pipelines from registry
    const allPipelines = await listPipelines();

    // 3. Multi-tenant filtering
    const allowedClients = getClientFilter(session.user.groups);
    const pipelines = filterPipelinesByClient(allPipelines, allowedClients);

    // 4. Enrich each pipeline in parallel (graceful degradation per pipeline)
    const enriched = await Promise.all(
      pipelines.map(async (pipeline): Promise<PipelineOverview> => {
        const results = await Promise.allSettled([
          isCurrentlyRunning(pipeline.state_machine_arn),
          listExecutions(pipeline.state_machine_arn, { maxResults: 10 }),
        ]);

        const running =
          results[0].status === "fulfilled" ? results[0].value : false;
        const execResult =
          results[1].status === "fulfilled" ? results[1].value : null;
        const executions = execResult?.executions ?? [];
        const latest = executions[0];

        const lastSync = buildLastSync(
          executions.find((e) => e.status !== "RUNNING")
        );

        let nextRunAt: string | null = null;
        if (pipeline.enabled && !running && lastSync?.timestamp) {
          const intervalMin = parseScheduleIntervalMinutes(
            pipeline.schedule_expression
          );
          if (intervalMin !== null) {
            const next = new Date(
              new Date(lastSync.timestamp).getTime() + intervalMin * 60_000
            );
            if (next.getTime() > Date.now()) {
              nextRunAt = next.toISOString();
            }
          }
        }

        return {
          pipelineId: pipeline.pipeline_id,
          clientName: pipeline.client_name,
          connectorType: pipeline.connector_type,
          environment: pipeline.environment,
          enabled: pipeline.enabled,
          status: computeStatus(running, latest),
          isCurrentlyRunning: running,
          lastSync,
          recentSuccessRate: computeSuccessRate(executions),
          scheduleExpression: pipeline.schedule_expression,
          nextRunAt,
        };
      })
    );

    const body: PipelinesListResponse = { pipelines: enriched };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
