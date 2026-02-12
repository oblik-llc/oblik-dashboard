import { NextResponse } from "next/server";
import { getTransformationJob } from "@/lib/aws/transformation-db";
import {
  isCurrentlyRunning,
  listExecutions,
} from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  getClientFilter,
  computeTransformationStatus,
  computeSuccessRate,
  buildLastSync,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  ExecutionSummaryResponse,
  TransformationJobDetailResponse,
} from "@/lib/types/api";
import type { ExecutionSummary } from "@/lib/types/pipeline";

export async function GET(
  _request: Request,
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

    // 5. Parallel enrichment
    const [runningResult, execResult] = await Promise.allSettled([
      isCurrentlyRunning(job.state_machine_arn),
      listExecutions(job.state_machine_arn, { maxResults: 10 }),
    ]);

    const running =
      runningResult.status === "fulfilled" ? runningResult.value : false;
    const executions =
      execResult.status === "fulfilled"
        ? execResult.value.executions
        : [];

    const latest = executions[0];

    // 6. Build response
    const body: TransformationJobDetailResponse = {
      jobId: job.job_id,
      clientName: job.client_name,
      jobName: job.job_name,
      triggerType: job.trigger_type,
      scheduleExpression: job.schedule_expression,
      dbtCommands: job.dbt_commands,
      dbtProjectPath: job.dbt_project_path,
      cpu: job.cpu,
      memory: job.memory,
      stateMachineArn: job.state_machine_arn,
      ecsLogGroup: job.ecs_log_group,
      sfnLogGroup: job.sfn_log_group,
      registeredAt: job.registered_at,
      enabled: job.enabled,
      status: computeTransformationStatus(running, latest),
      isCurrentlyRunning: running,
      lastRun: buildLastSync(
        executions.find((e) => e.status !== "RUNNING")
      ),
      recentSuccessRate: computeSuccessRate(executions),
      recentExecutions: executions.map(serializeExecution),
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

function serializeExecution(exec: ExecutionSummary): ExecutionSummaryResponse {
  return {
    executionArn: exec.executionArn,
    name: exec.name,
    status: exec.status,
    startDate: exec.startDate.toISOString(),
    stopDate: exec.stopDate?.toISOString() ?? null,
  };
}
