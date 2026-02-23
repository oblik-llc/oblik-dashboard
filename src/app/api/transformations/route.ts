import { NextResponse } from "next/server";
import { listTransformationJobs } from "@/lib/aws/transformation-db";
import {
  isCurrentlyRunning,
  listExecutions,
} from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  getClientFilter,
  filterTransformationJobsByClient,
  computeTransformationStatus,
  computeSuccessRate,
  buildLastSync,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  TransformationJobOverview,
  TransformationJobsListResponse,
} from "@/lib/types/api";

export async function GET() {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Fetch all transformation jobs from registry
    const allJobs = await listTransformationJobs();

    // 3. Multi-tenant filtering
    const allowedClients = getClientFilter(session.user.groups);
    const jobs = filterTransformationJobsByClient(allJobs, allowedClients);

    // 4. Group jobs by SFN ARN to deduplicate queries
    const sfnArnMap = new Map<
      string,
      { running: boolean; executions: Awaited<ReturnType<typeof listExecutions>>["executions"] }
    >();

    const uniqueArns = [...new Set(jobs.map((j) => j.state_machine_arn))];

    await Promise.all(
      uniqueArns.map(async (arn) => {
        const results = await Promise.allSettled([
          isCurrentlyRunning(arn),
          listExecutions(arn, { maxResults: 10 }),
        ]);

        const running =
          results[0].status === "fulfilled" ? results[0].value : false;
        const execResult =
          results[1].status === "fulfilled" ? results[1].value : null;

        sfnArnMap.set(arn, {
          running,
          executions: execResult?.executions ?? [],
        });
      })
    );

    // 5. Build overview for each job
    const enriched: TransformationJobOverview[] = jobs.map((job) => {
      const sfnData = sfnArnMap.get(job.state_machine_arn) ?? {
        running: false,
        executions: [],
      };

      const latest = sfnData.executions[0];

      return {
        jobId: job.job_id,
        clientName: job.client_name,
        jobName: job.job_name,
        triggerType: job.trigger_type,
        scheduleExpression: job.schedule_expression,
        dbtCommands: job.dbt_commands,
        status: computeTransformationStatus(sfnData.running, latest),
        isCurrentlyRunning: sfnData.running,
        lastRun: buildLastSync(
          sfnData.executions.find((e) => e.status !== "RUNNING")
        ),
        recentSuccessRate: computeSuccessRate(sfnData.executions),
      };
    });

    const body: TransformationJobsListResponse = { jobs: enriched };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
