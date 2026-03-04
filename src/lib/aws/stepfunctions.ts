import {
  ListExecutionsCommand,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import type { HistoryEvent } from "@aws-sdk/client-sfn";
import { getSFNClient } from "./client";
import type {
  ExecutionSummary,
  ExecutionDetail,
  ExecutionHistoryEvent,
  ExecutionDetailWithHistory,
  ListExecutionsOptions,
  ListExecutionsResult,
} from "@/lib/types/pipeline";
import { AwsServiceError } from "@/lib/types/pipeline";

export async function listExecutions(
  stateMachineArn: string,
  opts?: ListExecutionsOptions
): Promise<ListExecutionsResult> {
  const client = getSFNClient();

  try {
    const result = await client.send(
      new ListExecutionsCommand({
        stateMachineArn,
        statusFilter: opts?.statusFilter as
          | "RUNNING"
          | "SUCCEEDED"
          | "FAILED"
          | "TIMED_OUT"
          | "ABORTED"
          | undefined,
        maxResults: opts?.maxResults ?? 20,
        nextToken: opts?.nextToken,
      })
    );

    const executions: ExecutionSummary[] = (result.executions ?? []).map(
      (ex) => ({
        executionArn: ex.executionArn!,
        name: ex.name!,
        status: ex.status!,
        startDate: ex.startDate!,
        stopDate: ex.stopDate,
      })
    );

    return { executions, nextToken: result.nextToken };
  } catch (error) {
    throw new AwsServiceError("StepFunctions", "ListExecutions", error);
  }
}

export async function getExecutionDetail(
  executionArn: string
): Promise<ExecutionDetailWithHistory> {
  const client = getSFNClient();

  try {
    const [describeResult, historyResult] = await Promise.all([
      client.send(
        new DescribeExecutionCommand({ executionArn })
      ),
      client.send(
        new GetExecutionHistoryCommand({
          executionArn,
          reverseOrder: true,
          maxResults: 200,
        })
      ),
    ]);

    const detail: ExecutionDetail = {
      executionArn: describeResult.executionArn!,
      name: describeResult.name!,
      status: describeResult.status!,
      startDate: describeResult.startDate!,
      stopDate: describeResult.stopDate,
      input: describeResult.input,
      output: describeResult.output,
      error: describeResult.error,
      cause: describeResult.cause,
      stateMachineArn: describeResult.stateMachineArn!,
    };

    const history = (historyResult.events ?? []).map((ev) =>
      flattenHistoryEvent(ev)
    );

    const ecsTaskLogStream = extractEcsTaskLogStream(
      historyResult.events ?? []
    );

    return { detail, history, ecsTaskLogStream };
  } catch (error) {
    throw new AwsServiceError("StepFunctions", "DescribeExecution", error);
  }
}

function extractEcsTaskLogStream(
  events: HistoryEvent[]
): string | null {
  for (const ev of events) {
    const det = ev.taskSucceededEventDetails;
    if (det?.resourceType !== "ecs" || !det.output) continue;
    try {
      const out = JSON.parse(det.output) as {
        Containers?: Array<{ Name?: string; TaskArn?: string }>;
      };
      const container = out.Containers?.[0];
      if (!container?.Name || !container?.TaskArn) continue;
      const taskId = container.TaskArn.split("/").pop();
      if (!taskId) continue;
      return `ecs/${container.Name}/${taskId}`;
    } catch (err) {
      console.error(
        "[extractEcsTaskLogStream] Failed to parse ECS task output",
        { outputPreview: det.output?.slice(0, 200) },
        err
      );
    }
  }
  return null;
}

function flattenHistoryEvent(ev: HistoryEvent): ExecutionHistoryEvent {
  const event: ExecutionHistoryEvent = {
    id: ev.id!,
    timestamp: ev.timestamp!,
    type: ev.type!,
  };

  // Extract stateName from state-related event details
  const stateDetail =
    ev.stateEnteredEventDetails ?? ev.stateExitedEventDetails;
  if (stateDetail?.name) {
    event.stateName = stateDetail.name;
  }

  // Extract error/cause from failure event details
  const failureDetail =
    ev.executionFailedEventDetails ??
    ev.taskFailedEventDetails ??
    ev.lambdaFunctionFailedEventDetails ??
    ev.activityFailedEventDetails;
  if (failureDetail) {
    event.error = failureDetail.error;
    event.cause = failureDetail.cause;
  }

  return event;
}

export interface StartExecutionInput {
  stateMachineArn: string;
  name: string;
  input: string;
}

export interface StartExecutionResult {
  executionArn: string;
  startDate: Date;
}

export async function startExecution(
  params: StartExecutionInput
): Promise<StartExecutionResult> {
  const client = getSFNClient();

  try {
    const result = await client.send(
      new StartExecutionCommand({
        stateMachineArn: params.stateMachineArn,
        name: params.name,
        input: params.input,
      })
    );

    return {
      executionArn: result.executionArn!,
      startDate: result.startDate!,
    };
  } catch (error) {
    throw new AwsServiceError("StepFunctions", "StartExecution", error);
  }
}

export async function describeExecution(
  executionArn: string
): Promise<ExecutionDetail> {
  const client = getSFNClient();

  try {
    const result = await client.send(
      new DescribeExecutionCommand({ executionArn })
    );

    return {
      executionArn: result.executionArn!,
      name: result.name!,
      status: result.status!,
      startDate: result.startDate!,
      stopDate: result.stopDate,
      input: result.input,
      output: result.output,
      error: result.error,
      cause: result.cause,
      stateMachineArn: result.stateMachineArn!,
    };
  } catch (error) {
    throw new AwsServiceError("StepFunctions", "DescribeExecution", error);
  }
}

export async function isCurrentlyRunning(
  stateMachineArn: string
): Promise<boolean> {
  const result = await listExecutions(stateMachineArn, {
    statusFilter: "RUNNING",
    maxResults: 1,
  });
  return result.executions.length > 0;
}

export async function getLatestExecution(
  stateMachineArn: string
): Promise<ExecutionSummary | null> {
  const result = await listExecutions(stateMachineArn, { maxResults: 1 });
  return result.executions[0] ?? null;
}

// ── Job-filtered execution helpers (transformation pipelines) ──

/**
 * Extracts the job name from a Step Functions execution input payload.
 * Returns null if input is missing or doesn't contain a recognizable job.
 */
function extractJobName(input?: string): string | null {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    const jobs = parsed.jobs;
    if (Array.isArray(jobs) && jobs.length > 0) {
      return jobs[0].job_name ?? null;
    }
  } catch {
    // Malformed input — skip
  }
  return null;
}

/**
 * Lists executions for a specific job by filtering on the execution input payload.
 * Fetches candidate executions, describes each to get the input, and returns
 * only those whose `jobs[].job_name` matches the target.
 */
export async function listExecutionsForJob(
  stateMachineArn: string,
  jobName: string,
  opts?: ListExecutionsOptions
): Promise<ListExecutionsResult> {
  const desiredCount = opts?.maxResults ?? 20;
  // Fetch more candidates than needed since some won't match
  const candidateCount = Math.min(desiredCount * 3, 100);

  const candidates = await listExecutions(stateMachineArn, {
    statusFilter: opts?.statusFilter,
    maxResults: candidateCount,
    nextToken: opts?.nextToken,
  });

  // Describe each execution in parallel to get the input payload
  const described = await describeExecutionsBatch(
    candidates.executions.map((e) => e.executionArn)
  );

  // Build a lookup of executionArn -> input
  const inputByArn = new Map<string, string | undefined>();
  for (const detail of described) {
    inputByArn.set(detail.executionArn, detail.input);
  }

  // Filter to matching executions, preserving the original summary objects
  const matching = candidates.executions.filter((exec) => {
    const input = inputByArn.get(exec.executionArn);
    return extractJobName(input) === jobName;
  });

  return {
    executions: matching.slice(0, desiredCount),
    nextToken: candidates.nextToken,
  };
}

/**
 * Checks if a specific job is currently running by inspecting RUNNING
 * executions' input payloads.
 */
export async function isJobCurrentlyRunning(
  stateMachineArn: string,
  jobName: string
): Promise<boolean> {
  const result = await listExecutionsForJob(stateMachineArn, jobName, {
    statusFilter: "RUNNING",
    maxResults: 1,
  });
  return result.executions.length > 0;
}

/**
 * Describes multiple executions in parallel and returns their details.
 * Used internally to get the `input` field for filtering.
 */
async function describeExecutionsBatch(
  executionArns: string[]
): Promise<ExecutionDetail[]> {
  if (executionArns.length === 0) return [];

  const results = await Promise.allSettled(
    executionArns.map((arn) => describeExecution(arn))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ExecutionDetail> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}

/**
 * Describes a batch of executions and groups them by job name.
 * Returns a map of jobName -> ExecutionSummary[].
 * Executions with unrecognizable input are omitted.
 */
export async function groupExecutionsByJob(
  executions: ExecutionSummary[]
): Promise<Map<string, ExecutionSummary[]>> {
  const described = await describeExecutionsBatch(
    executions.map((e) => e.executionArn)
  );

  const inputByArn = new Map<string, string | undefined>();
  for (const detail of described) {
    inputByArn.set(detail.executionArn, detail.input);
  }

  const grouped = new Map<string, ExecutionSummary[]>();
  for (const exec of executions) {
    const input = inputByArn.get(exec.executionArn);
    const name = extractJobName(input);
    if (!name) continue;

    const list = grouped.get(name);
    if (list) {
      list.push(exec);
    } else {
      grouped.set(name, [exec]);
    }
  }

  return grouped;
}
