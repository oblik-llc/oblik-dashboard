// ── Pipeline Registry (DynamoDB: oblik-pipeline-registry) ──

export interface Pipeline {
  pipeline_id: string;
  client_name: string;
  connector_type: string;
  environment: string;
  state_machine_arn: string;
  ecs_cluster_name: string;
  sync_state_table_name: string;
  s3_archive_bucket: string;
  sns_topic_arn: string;
  schedule_arn: string;
  schedule_expression: string;
  destination_type: string;
  container_image: string;
  ecs_log_group: string;
  sfn_log_group: string;
  enabled: boolean;
  registered_at: string;
  updated_at: string;
}

// ── Sync State (per-pipeline DynamoDB tables) ──

export interface SyncStreamResult {
  count: number;
  s3_path: string;
}

export interface SyncStats {
  total_records: number;
  execution_duration?: number;
  streams?: string[];
  partial_completion?: boolean;
  results?: Record<string, SyncStreamResult>;
  // HubSpot-style checkpoints
  is_checkpoint?: boolean;
  checkpoint_time?: string;
  streams_with_state?: string[];
}

export interface AirbyteStreamState {
  type: string;
  stream: {
    stream_descriptor: { name: string };
    stream_state: Record<string, unknown>;
  };
  sourceStats?: { recordCount: number };
}

export interface SyncState {
  client_connector: string;
  last_sync: string;
  last_execution_status: string;
  updated_at?: string;
  sync_stats?: SyncStats;
  airbyte_state?: AirbyteStreamState[];
}

// ── Step Functions ──

export interface ExecutionSummary {
  executionArn: string;
  name: string;
  status: string;
  startDate: Date;
  stopDate?: Date;
}

export interface ExecutionDetail {
  executionArn: string;
  name: string;
  status: string;
  startDate: Date;
  stopDate?: Date;
  input?: string;
  output?: string;
  error?: string;
  cause?: string;
  stateMachineArn: string;
}

export interface ExecutionHistoryEvent {
  id: number;
  timestamp: Date;
  type: string;
  stateName?: string;
  error?: string;
  cause?: string;
}

export interface ExecutionDetailWithHistory {
  detail: ExecutionDetail;
  history: ExecutionHistoryEvent[];
}

export interface ListExecutionsOptions {
  statusFilter?: string;
  maxResults?: number;
  nextToken?: string;
}

export interface ListExecutionsResult {
  executions: ExecutionSummary[];
  nextToken?: string;
}

// ── CloudWatch Metrics ──

export type MetricPeriod = "1h" | "6h" | "24h" | "7d" | "30d";

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface PipelineMetrics {
  executionsSucceeded: MetricDataPoint[];
  executionsFailed: MetricDataPoint[];
  executionsStarted: MetricDataPoint[];
  executionTime: MetricDataPoint[];
}

// ── CloudWatch Logs ──

export interface LogEvent {
  timestamp: number;
  message: string;
  ingestionTime?: number;
  eventId?: string;
}

export interface LogQueryResult {
  events: LogEvent[];
  nextToken?: string;
}

// ── Errors ──

export class AwsServiceError extends Error {
  public readonly service: string;
  public readonly operation: string;

  constructor(service: string, operation: string, cause: unknown) {
    const message =
      cause instanceof Error ? cause.message : "Unknown AWS error";
    super(`${service}.${operation}: ${message}`);
    this.name = "AwsServiceError";
    this.service = service;
    this.operation = operation;
    this.cause = cause;
  }
}
