import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
      <AlertCircle className="size-8 text-red-500 dark:text-red-400" />
      <div>
        <p className="font-medium text-red-800 dark:text-red-200">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
