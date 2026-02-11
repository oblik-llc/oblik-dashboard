// ── SLA Config (DynamoDB: oblik-sla-config) ──

export interface SlaConfig {
  pipeline_id: string;
  enabled: boolean;
  uptimeTargetPercent: number;
  maxExecutionDurationSeconds: number;
  freshnessWindowMinutes: number;
  updatedAt: string;
  updatedBy: string;
}
