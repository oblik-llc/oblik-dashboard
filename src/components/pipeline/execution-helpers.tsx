import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "SUCCEEDED":
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case "FAILED":
    case "TIMED_OUT":
    case "ABORTED":
      return <XCircle className="size-4 text-red-500" />;
    case "RUNNING":
      return <Loader2 className="size-4 animate-spin text-blue-500" />;
    default:
      return <div className="size-4 rounded-full bg-zinc-300" />;
  }
}

export function formatDuration(start: string, stop: string | null): string {
  if (!stop) return "Running...";
  const ms = new Date(stop).getTime() - new Date(start).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function executionIdFromArn(arn: string): string {
  const parts = arn.split(":");
  return parts[parts.length - 1];
}
