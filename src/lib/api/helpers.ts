import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import type { Session } from "next-auth";
import type { Pipeline, ExecutionSummary } from "@/lib/types/pipeline";
import type { TransformationJob } from "@/lib/types/transformation";
import { AwsServiceError } from "@/lib/types/pipeline";
import type { PipelineStatus, LastSyncSummary } from "@/lib/types/api";

// ── Auth helpers ──

export function isAdmin(groups: string[]): boolean {
  return groups.includes("Admin");
}

interface AuthResult {
  session: Session;
  errorResponse?: never;
}

interface AuthError {
  session?: never;
  errorResponse: NextResponse;
}

export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await auth();

  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { session };
}

export function getClientFilter(groups: string[]): string[] | null {
  const clientNames = groups
    .filter((g) => g.startsWith("client:"))
    .map((g) => g.slice("client:".length));

  // No client groups means admin — no filtering
  return clientNames.length > 0 ? clientNames : null;
}

export function filterPipelinesByClient(
  pipelines: Pipeline[],
  allowedClients: string[] | null
): Pipeline[] {
  if (!allowedClients) return pipelines;
  return pipelines.filter((p) => allowedClients.includes(p.client_name));
}

export function filterTransformationJobsByClient(
  jobs: TransformationJob[],
  allowedClients: string[] | null
): TransformationJob[] {
  if (!allowedClients) return jobs;
  return jobs.filter((j) => allowedClients.includes(j.client_name));
}

// ── Status helpers ──

export function computeStatus(
  isRunning: boolean,
  latestExecution: ExecutionSummary | undefined
): PipelineStatus {
  if (isRunning) return "running";
  if (!latestExecution) return "unknown";

  switch (latestExecution.status) {
    case "SUCCEEDED":
      return "healthy";
    case "FAILED":
    case "TIMED_OUT":
    case "ABORTED":
      return "failing";
    default:
      return "unknown";
  }
}

export function computeSuccessRate(executions: ExecutionSummary[]): number {
  const completed = executions.filter((e) => e.status !== "RUNNING");
  if (completed.length === 0) return 0;

  const succeeded = completed.filter((e) => e.status === "SUCCEEDED").length;
  return Math.round((succeeded / completed.length) * 100) / 100;
}

export function computeDurationSeconds(
  startDate: Date,
  stopDate?: Date
): number | null {
  if (!stopDate) return null;
  return Math.round((stopDate.getTime() - startDate.getTime()) / 1000);
}

export function buildLastSync(
  execution: ExecutionSummary | undefined,
  detail?: { output?: string }
): LastSyncSummary | null {
  if (!execution) return null;

  // Use the latest completed (non-RUNNING) execution
  if (execution.status === "RUNNING") return null;

  let recordCount: number | null = null;
  if (detail?.output) {
    try {
      const parsed = JSON.parse(detail.output);
      if (typeof parsed.recordCount === "number") {
        recordCount = parsed.recordCount;
      }
    } catch {
      // Output isn't valid JSON or doesn't have recordCount — that's fine
    }
  }

  return {
    timestamp: (execution.stopDate ?? execution.startDate).toISOString(),
    status: execution.status,
    recordCount,
    durationSeconds: computeDurationSeconds(
      execution.startDate,
      execution.stopDate
    ),
  };
}

export function computeTransformationStatus(
  isRunning: boolean,
  latestExecution: ExecutionSummary | undefined
): PipelineStatus {
  if (isRunning) return "running";
  if (!latestExecution) return "unknown";

  switch (latestExecution.status) {
    case "SUCCEEDED":
      return "healthy";
    case "FAILED":
    case "TIMED_OUT":
    case "ABORTED":
      return "failing";
    default:
      return "unknown";
  }
}

// ── Error helpers ──

export function handleAwsError(error: unknown): NextResponse {
  console.error("[API] AWS error:", error);

  if (error instanceof AwsServiceError) {
    return NextResponse.json(
      {
        error: "AWS Service Error",
        message: `${error.service}.${error.operation} failed`,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { error: "Internal Server Error", message: "An unexpected error occurred" },
    { status: 500 }
  );
}
