// ── Transformation Registry (DynamoDB: oblik-transformation-registry) ──

export interface TransformationJob {
  job_id: string; // PK: "{client}#{job_name}"
  client_name: string;
  job_name: string;
  environment: string;
  trigger_type: string; // "cron" | "event" | "manual"
  schedule_expression: string | null;
  dbt_commands: string[];
  dbt_project_path: string;
  cpu: number;
  memory: number;
  state_machine_arn: string;
  state_table_name: string;
  ecs_cluster_name: string;
  ecs_log_group: string;
  sfn_log_group: string;
  enabled: boolean;
  registered_at: string;
  updated_at: string;
}
