import { getAlertPreferences, putAlertHistoryEntry, getLastAlertTime } from "./alerts-db";
import { sendEmailAlert, sendSlackAlert } from "./alerts-delivery";
import { listExecutions, describeExecution } from "./stepfunctions";
import { getPipeline } from "./dynamodb";
import { getSlaConfig } from "./sla-db";
import type {
  AlertEvaluatePayload,
  AlertType,
  AlertChannel,
  AlertHistoryEntry,
  AlertTriggers,
} from "@/lib/types/alerts";

const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const TTL_DAYS = 90;

export async function evaluateAlert(
  payload: AlertEvaluatePayload
): Promise<{ alertsSent: number }> {
  const { pipelineId, executionArn, executionStatus, stateMachineArn } = payload;

  // Load preferences
  const prefs = await getAlertPreferences(pipelineId);
  if (!prefs || !prefs.enabled) {
    return { alertsSent: 0 };
  }

  // Determine which alert types apply
  const alertTypes = await determineAlertTypes(
    pipelineId,
    executionArn,
    executionStatus,
    stateMachineArn,
    prefs.triggers
  );

  if (alertTypes.length === 0) {
    return { alertsSent: 0 };
  }

  // Rate limit check (5 min per pipeline)
  const lastAlert = await getLastAlertTime(pipelineId);
  if (lastAlert) {
    const elapsed = Date.now() - new Date(lastAlert).getTime();
    if (elapsed < RATE_LIMIT_MS) {
      console.log(
        `[alerts] Rate limited for ${pipelineId}: last alert ${Math.round(elapsed / 1000)}s ago`
      );
      return { alertsSent: 0 };
    }
  }

  // Load pipeline for SNS topic ARN
  const pipeline = await getPipeline(pipelineId);
  if (!pipeline) {
    console.error(`[alerts] Pipeline ${pipelineId} not found`);
    return { alertsSent: 0 };
  }

  let alertsSent = 0;

  for (const alertType of alertTypes) {
    const message = buildMessage(pipelineId, alertType, executionStatus, executionArn);

    // Send to each enabled channel
    const channels: AlertChannel[] = [];
    if (prefs.channels.email.enabled) channels.push("email");
    if (prefs.channels.slack.enabled && prefs.channels.slack.webhookUrl) {
      channels.push("slack");
    }

    for (const channel of channels) {
      const now = new Date().toISOString();
      const historyEntry: AlertHistoryEntry = {
        pipeline_id: pipelineId,
        sent_at: now,
        alertType,
        channel,
        success: false,
        executionArn,
        executionStatus,
        message,
        ttl: Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
      };

      try {
        if (channel === "email") {
          const subject = `Oblik Alert: ${alertType.replace("_", " ")} — ${pipelineId}`;
          await sendEmailAlert(pipeline.sns_topic_arn, subject, message);
        } else if (channel === "slack") {
          await sendSlackAlert(
            prefs.channels.slack.webhookUrl!,
            message,
            pipelineId,
            alertType
          );
        }
        historyEntry.success = true;
        alertsSent++;
      } catch (error) {
        historyEntry.errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[alerts] Failed to send ${channel} alert for ${pipelineId}:`,
          error
        );
      }

      await putAlertHistoryEntry(historyEntry);
    }
  }

  return { alertsSent };
}

async function determineAlertTypes(
  pipelineId: string,
  executionArn: string,
  executionStatus: string,
  stateMachineArn: string,
  triggers: AlertTriggers
): Promise<AlertType[]> {
  const alertTypes: AlertType[] = [];
  const isFailed = ["FAILED", "TIMED_OUT", "ABORTED"].includes(executionStatus);
  const isSucceeded = executionStatus === "SUCCEEDED";

  if (isFailed) {
    // Check consecutive failures first (higher priority)
    if (triggers.onConsecutiveFailures.enabled) {
      const consecutive = await countConsecutiveFailures(stateMachineArn);
      if (consecutive >= triggers.onConsecutiveFailures.threshold) {
        alertTypes.push("consecutive_failures");
      } else if (triggers.onFailure) {
        // Only fire simple failure if consecutive threshold not met
        alertTypes.push("failure");
      }
    } else if (triggers.onFailure) {
      alertTypes.push("failure");
    }
  }

  if (isSucceeded && triggers.onRecovery) {
    // Check if previous execution was a failure
    const wasRecovery = await checkRecovery(stateMachineArn);
    if (wasRecovery) {
      alertTypes.push("recovery");
    }
  }

  // SLA breach check
  if (triggers.onSLABreach?.enabled) {
    const breached = await checkSLABreach(
      pipelineId,
      executionArn,
      stateMachineArn
    );
    if (breached) {
      alertTypes.push("sla_breach");
    }
  }

  return alertTypes;
}

async function checkSLABreach(
  pipelineId: string,
  executionArn: string,
  stateMachineArn: string
): Promise<boolean> {
  try {
    const slaConfig = await getSlaConfig(pipelineId);
    if (!slaConfig?.enabled) return false;

    // Check if current execution duration exceeds max
    const detail = await describeExecution(executionArn);
    if (detail.stopDate && detail.startDate) {
      const durationSeconds =
        (detail.stopDate.getTime() - detail.startDate.getTime()) / 1000;
      if (durationSeconds > slaConfig.maxExecutionDurationSeconds) {
        return true;
      }
    }

    // Check recent uptime against target
    const result = await listExecutions(stateMachineArn, { maxResults: 20 });
    const completed = result.executions.filter((e) => e.status !== "RUNNING");
    if (completed.length > 0) {
      const succeeded = completed.filter(
        (e) => e.status === "SUCCEEDED"
      ).length;
      const uptimePercent = (succeeded / completed.length) * 100;
      if (uptimePercent < slaConfig.uptimeTargetPercent) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(
      `[alerts] SLA breach check failed for ${pipelineId}:`,
      error
    );
    return false;
  }
}

async function countConsecutiveFailures(
  stateMachineArn: string
): Promise<number> {
  const result = await listExecutions(stateMachineArn, { maxResults: 10 });
  const completed = result.executions.filter((e) => e.status !== "RUNNING");

  let count = 0;
  for (const ex of completed) {
    if (["FAILED", "TIMED_OUT", "ABORTED"].includes(ex.status)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

async function checkRecovery(stateMachineArn: string): Promise<boolean> {
  const result = await listExecutions(stateMachineArn, { maxResults: 5 });
  const completed = result.executions.filter((e) => e.status !== "RUNNING");

  // Need at least 2 completed: current (SUCCEEDED) and previous
  if (completed.length < 2) return false;

  // completed[0] is the current SUCCEEDED execution
  // completed[1] is the previous execution
  const previous = completed[1];
  return ["FAILED", "TIMED_OUT", "ABORTED"].includes(previous.status);
}

function buildMessage(
  pipelineId: string,
  alertType: AlertType,
  executionStatus: string,
  executionArn: string
): string {
  const executionName = executionArn.split(":").pop() ?? executionArn;

  switch (alertType) {
    case "failure":
      return `Pipeline *${pipelineId}* execution failed.\n\nStatus: ${executionStatus}\nExecution: ${executionName}`;
    case "consecutive_failures":
      return `Pipeline *${pipelineId}* has multiple consecutive failures.\n\nLatest status: ${executionStatus}\nExecution: ${executionName}`;
    case "recovery":
      return `Pipeline *${pipelineId}* has recovered.\n\nStatus: ${executionStatus}\nExecution: ${executionName}`;
    case "sla_breach":
      return `Pipeline *${pipelineId}* has breached its SLA.\n\nStatus: ${executionStatus}\nExecution: ${executionName}\n\nCheck the Analytics page for details.`;
  }
}
