import type { SyncConfig } from "./pipeline";

// ── Common ──

export type PipelineStatus = "healthy" | "failing" | "running" | "unknown";

export interface ApiErrorResponse {
  error: string;
  message: string;
}

// ── List endpoint ──

export interface LastSyncSummary {
  timestamp: string; // ISO 8601
  status: string;
  recordCount: number | null;
  durationSeconds: number | null;
}

export interface PipelineOverview {
  pipelineId: string;
  clientName: string;
  connectorType: string;
  environment: string;
  enabled: boolean;
  status: PipelineStatus;
  isCurrentlyRunning: boolean;
  lastSync: LastSyncSummary | null;
  recentSuccessRate: number;
  scheduleExpression: string;
}

export interface PipelinesListResponse {
  pipelines: PipelineOverview[];
}

// ── Detail endpoint ──

export interface ExecutionSummaryResponse {
  executionArn: string;
  name: string;
  status: string;
  startDate: string; // ISO 8601
  stopDate: string | null;
}

export interface SyncStateResponse {
  clientConnector: string;
  lastSyncTimestamp: string;
  lastExecutionStatus: string;
  syncConfig: SyncConfig;
}

export interface MetricDataPointResponse {
  timestamp: string; // ISO 8601
  value: number;
}

export interface PipelineMetricsResponse {
  executionsSucceeded: MetricDataPointResponse[];
  executionsFailed: MetricDataPointResponse[];
  executionsStarted: MetricDataPointResponse[];
  executionTime: MetricDataPointResponse[];
}

export interface PipelineDetailResponse {
  pipelineId: string;
  clientName: string;
  connectorType: string;
  environment: string;
  enabled: boolean;
  stateMachineArn: string;
  ecsClusterName: string;
  syncStateTableName: string;
  s3ArchiveBucket: string;
  snsTopicArn: string;
  scheduleArn: string;
  scheduleExpression: string;
  destinationType: string;
  containerImage: string;
  ecsLogGroup: string;
  sfnLogGroup: string;
  registeredAt: string;
  updatedAt: string;
  status: PipelineStatus;
  isCurrentlyRunning: boolean;
  lastSync: LastSyncSummary | null;
  recentSuccessRate: number;
  recentExecutions: ExecutionSummaryResponse[];
  syncState: SyncStateResponse | null;
  metrics: PipelineMetricsResponse;
}
