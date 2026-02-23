import { NextResponse } from "next/server";
import { listTransformationJobs } from "@/lib/aws/transformation-db";
import {
  listExecutions,
  groupExecutionsByJob,
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

    // 4. Fetch executions per unique SFN ARN, then group by job name
    const uniqueArns = [...new Set(jobs.map((j) => j.state_machine_arn))];

    // Fetch executions for each ARN (including RUNNING for status detection)
    const arnExecutions = new Map<
      string,
      { all: Awaited<ReturnType<typeof listExecutions>>["executions"]; running: Awaited<ReturnType<typeof listExecutions>>["executions"] }
    >();

    await Promise.all(
      uniqueArns.map(async (arn) => {
        const results = await Promise.allSettled([
          listExecutions(arn, { maxResults: 20 }),
          listExecutions(arn, { statusFilter: "RUNNING", maxResults: 10 }),
        ]);

        const arnAllExecs =
          results[0].status === "fulfilled"
            ? results[0].value.executions
            : [];
        const arnRunningExecs =
          results[1].status === "fulfilled"
            ? results[1].value.executions
            : [];

        arnExecutions.set(arn, { all: arnAllExecs, running: arnRunningExecs });
      })
    );

    // Collect all executions and group by job name via input inspection
    const allExecs = [...arnExecutions.values()].flatMap((v) => v.all);
    const allRunning = new Set(
      [...arnExecutions.values()]
        .flatMap((v) => v.running)
        .map((e) => e.executionArn)
    );

    const execsByJob = await groupExecutionsByJob(allExecs);

    // Derive running status per job from the grouped results
    const runningByJob = new Map<string, boolean>();
    for (const [jobName, execs] of execsByJob) {
      runningByJob.set(
        jobName,
        execs.some((e) => allRunning.has(e.executionArn))
      );
    }

    // 5. Build overview for each job using its own executions
    const enriched: TransformationJobOverview[] = jobs.map((job) => {
      const jobExecs = execsByJob.get(job.job_name) ?? [];
      const isRunning = runningByJob.get(job.job_name) ?? false;
      const latest = jobExecs[0];

      return {
        jobId: job.job_id,
        clientName: job.client_name,
        jobName: job.job_name,
        triggerType: job.trigger_type,
        scheduleExpression: job.schedule_expression,
        dbtCommands: job.dbt_commands,
        status: computeTransformationStatus(isRunning, latest),
        isCurrentlyRunning: isRunning,
        lastRun: buildLastSync(
          jobExecs.find((e) => e.status !== "RUNNING")
        ),
        recentSuccessRate: computeSuccessRate(jobExecs),
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
