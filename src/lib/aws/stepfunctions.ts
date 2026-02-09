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

    return { detail, history };
  } catch (error) {
    throw new AwsServiceError("StepFunctions", "DescribeExecution", error);
  }
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
