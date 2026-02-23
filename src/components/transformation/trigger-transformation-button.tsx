"use client";

import { useState, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiErrorResponse } from "@/lib/types/api";

interface TriggerTransformationButtonProps {
  jobId: string;
  jobName: string;
  isAdmin: boolean;
  isDisabled: boolean;
  isRunning: boolean;
  onTriggered: () => void;
}

export function TriggerTransformationButton({
  jobId,
  jobName,
  isAdmin,
  isDisabled,
  isRunning,
  onTriggered,
}: TriggerTransformationButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTrigger = isAdmin && !isDisabled && !isRunning;

  const tooltipMessage = !isAdmin
    ? "Only admins can trigger transformations"
    : isDisabled
      ? "Job is disabled"
      : isRunning
        ? "An execution is already running"
        : null;

  const handleTrigger = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/transformations/${encodeURIComponent(jobId)}/trigger`,
        { method: "POST" }
      );

      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        setError(body.message);
        return;
      }

      setDialogOpen(false);
      onTriggered();
    } catch {
      setError("Failed to trigger transformation. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [jobId, onTriggered]);

  const button = (
    <Button
      variant="outline"
      size="sm"
      disabled={!canTrigger || loading}
      onClick={() => {
        setError(null);
        setDialogOpen(true);
      }}
      className={
        canTrigger
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
          : undefined
      }
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Play className="size-3.5" />
      )}
      Run Now
    </Button>
  );

  return (
    <>
      {tooltipMessage ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {tooltipMessage}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger transformation</AlertDialogTitle>
            <AlertDialogDescription>
              This will start a new dbt transformation for{" "}
              <span className="font-medium text-foreground">
                {jobName}
              </span>
              . The job will run immediately via EventBridge.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                handleTrigger();
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Start Transformation
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
