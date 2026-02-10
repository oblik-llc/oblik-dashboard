// ── Alert Preferences (DynamoDB: oblik-alert-preferences) ──

export interface AlertChannels {
  email: { enabled: boolean };
  slack: { enabled: boolean; webhookUrl?: string };
}

export interface AlertTriggers {
  onFailure: boolean;
  onConsecutiveFailures: { enabled: boolean; threshold: number };
  onRecovery: boolean;
}

export interface AlertPreferences {
  pipeline_id: string;
  enabled: boolean;
  channels: AlertChannels;
  triggers: AlertTriggers;
  updatedAt: string;
  updatedBy: string;
}

// ── Alert History (DynamoDB: oblik-alert-history) ──

export type AlertType = "failure" | "consecutive_failures" | "recovery";
export type AlertChannel = "email" | "slack";

export interface AlertHistoryEntry {
  pipeline_id: string;
  sent_at: string; // ISO 8601 (sort key)
  alertType: AlertType;
  channel: AlertChannel;
  success: boolean;
  errorMessage?: string;
  executionArn?: string;
  executionStatus?: string;
  message: string;
  ttl: number; // Unix epoch seconds
}

// ── EventBridge payload ──

export interface AlertEvaluatePayload {
  pipelineId: string;
  executionArn: string;
  executionStatus: string;
  stateMachineArn: string;
}
