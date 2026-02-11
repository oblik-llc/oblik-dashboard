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
  syncMode: "incremental" | "full_refresh";
  streamState: Record<string, unknown> | null;
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

// ── Execution records endpoint ──

export interface ExecutionRecordDataPoint {
  executionName: string;
  startDate: string; // ISO 8601
  stopDate: string | null;
  status: string;
  recordCount: number | null;
  durationSeconds: number | null;
}

export interface ExecutionRecordsResponse {
  dataPoints: ExecutionRecordDataPoint[];
}

// ── Trigger sync endpoint ──

export interface TriggerSyncResponse {
  executionArn: string;
  executionName: string;
  startDate: string; // ISO 8601
}

// ── Alert preferences endpoint ──

export interface AlertPreferencesResponse {
  pipelineId: string;
  enabled: boolean;
  channels: {
    email: { enabled: boolean };
    slack: { enabled: boolean; webhookUrl: string | null; isConfigured: boolean };
  };
  triggers: {
    onFailure: boolean;
    onConsecutiveFailures: { enabled: boolean; threshold: number };
    onRecovery: boolean;
    onSLABreach?: { enabled: boolean };
  };
}

export interface AlertPreferencesUpdateRequest {
  enabled: boolean;
  channels: {
    email: { enabled: boolean };
    slack: { enabled: boolean; webhookUrl?: string };
  };
  triggers: {
    onFailure: boolean;
    onConsecutiveFailures: { enabled: boolean; threshold: number };
    onRecovery: boolean;
    onSLABreach?: { enabled: boolean };
  };
}

export interface AlertHistoryEntryResponse {
  sentAt: string;
  alertType: string;
  channel: string;
  success: boolean;
  errorMessage?: string;
  message: string;
}

export interface AlertHistoryResponse {
  entries: AlertHistoryEntryResponse[];
}

export interface TestAlertResponse {
  results: { channel: string; success: boolean; error?: string }[];
}

// ── SLA config endpoint ──

export interface SlaConfigResponse {
  pipelineId: string;
  enabled: boolean;
  uptimeTargetPercent: number;
  maxExecutionDurationSeconds: number;
  freshnessWindowMinutes: number;
}

export interface SlaConfigUpdateRequest {
  enabled: boolean;
  uptimeTargetPercent: number;
  maxExecutionDurationSeconds: number;
  freshnessWindowMinutes: number;
}

// ── Analytics endpoint ──

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export interface PipelineAnalyticsResponse {
  pipelineId: string;
  period: AnalyticsPeriod;
  uptimePercent: number;
  totalExecutions: number;
  succeededCount: number;
  failedCount: number;
  totalRecordsSynced: number;
  avgRecordsPerSync: number;
  avgDurationSeconds: number;
  p95DurationSeconds: number;
  freshnessPercent: number | null;
  executionsOverDurationSla: number;
  slaConfig: SlaConfigResponse | null;
}

export interface AnalyticsSummaryPipeline {
  pipelineId: string;
  clientName: string;
  uptimePercent: number;
  freshnessPercent: number | null;
  totalRecordsSynced: number;
  totalExecutions: number;
  slaCompliant: boolean;
}

export interface AnalyticsSummaryResponse {
  pipelines: AnalyticsSummaryPipeline[];
  totals: {
    totalPipelines: number;
    slaCompliantCount: number;
    overallUptimePercent: number;
    totalRecordsSynced: number;
    totalExecutions: number;
  };
}

// ── User management endpoints ──

export interface UserResponse {
  username: string;
  email: string;
  status: string;
  enabled: boolean;
  createdAt: string;
  lastModifiedAt: string;
  groups: string[];
  isAdmin: boolean;
  clientGroups: string[];
}

export interface GroupResponse {
  name: string;
  description: string | null;
}

export interface UsersListResponse {
  users: UserResponse[];
  groups: GroupResponse[];
}

export interface InviteUserRequest {
  username: string;
  email: string;
}

export interface InviteUserResponse {
  username: string;
  email: string;
  temporaryPassword: boolean;
}

export interface UpdateUserGroupsRequest {
  addGroups?: string[];
  removeGroups?: string[];
}

export interface UpdateUserGroupsResponse {
  username: string;
  groups: string[];
}

export interface UpdateUserStatusRequest {
  enabled: boolean;
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
