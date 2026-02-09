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

// ── Executions list endpoint ──

export interface ExecutionsListResponse {
  executions: ExecutionSummaryResponse[];
  nextToken: string | null;
}

// ── Detail endpoint ──

export interface ExecutionSummaryResponse {
  executionArn: string;
  name: string;
  status: string;
  startDate: string; // ISO 8601
  stopDate: string | null;
}

export interface StreamSummary {
  name: string;
  recordCount: number | null;
  s3Path: string | null;
  cursorField: string | null;
  cursorValue: string | null;
}

export interface SyncStateResponse {
  clientConnector: string;
  lastSyncTimestamp: string;
  lastExecutionStatus: string;
  totalRecords: number | null;
  executionDuration: number | null;
  streams: StreamSummary[];
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

// ── Execution detail endpoint ──

export interface ExecutionHistoryEventResponse {
  id: number;
  timestamp: string; // ISO 8601
  type: string;
  stateName?: string;
  error?: string;
  cause?: string;
}

export interface ExecutionDetailResponse {
  executionArn: string;
  name: string;
  status: string;
  startDate: string; // ISO 8601
  stopDate: string | null;
  input: string | null;
  output: string | null;
  error: string | null;
  cause: string | null;
  stateMachineArn: string;
  history: ExecutionHistoryEventResponse[];
}

// ── Logs endpoint ──

export interface LogEventResponse {
  timestamp: string; // ISO 8601
  message: string;
  ingestionTime: string | null;
  eventId: string | null;
}

export interface LogsResponse {
  events: LogEventResponse[];
  nextToken: string | null;
}

// ── Pipeline detail endpoint ──

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
