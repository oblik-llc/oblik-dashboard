"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { SlaConfigResponse, SlaConfigUpdateRequest } from "@/lib/types/api";

interface SlaConfigFormProps {
  pipelineId: string;
  config: SlaConfigResponse;
  onSaved: () => void;
}

export function SlaConfigForm({
  pipelineId,
  config,
  onSaved,
}: SlaConfigFormProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [uptimeTarget, setUptimeTarget] = useState(config.uptimeTargetPercent);
  const [maxDuration, setMaxDuration] = useState(
    config.maxExecutionDurationSeconds
  );
  const [freshnessWindow, setFreshnessWindow] = useState(
    config.freshnessWindowMinutes
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setEnabled(config.enabled);
    setUptimeTarget(config.uptimeTargetPercent);
    setMaxDuration(config.maxExecutionDurationSeconds);
    setFreshnessWindow(config.freshnessWindowMinutes);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const body: SlaConfigUpdateRequest = {
      enabled,
      uptimeTargetPercent: uptimeTarget,
      maxExecutionDurationSeconds: maxDuration,
      freshnessWindowMinutes: freshnessWindow,
    };

    try {
      const res = await fetch(
        `/api/pipelines/${encodeURIComponent(pipelineId)}/sla`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }

      setMessage({ type: "success", text: "SLA config saved" });
      onSaved();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Configuration</CardTitle>
        <CardDescription>Set performance thresholds for this pipeline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable SLA Monitoring</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track compliance against these thresholds
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <div className="border-t" />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="uptime-target" className="text-xs">
                  Uptime Target (%)
                </Label>
                <Input
                  id="uptime-target"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={uptimeTarget}
                  onChange={(e) =>
                    setUptimeTarget(parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-duration" className="text-xs">
                  Max Duration (seconds)
                </Label>
                <Input
                  id="max-duration"
                  type="number"
                  min={1}
                  value={maxDuration}
                  onChange={(e) =>
                    setMaxDuration(parseInt(e.target.value) || 1)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="freshness-window" className="text-xs">
                  Freshness Window (minutes)
                </Label>
                <Input
                  id="freshness-window"
                  type="number"
                  min={1}
                  value={freshnessWindow}
                  onChange={(e) =>
                    setFreshnessWindow(parseInt(e.target.value) || 1)
                  }
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
          {message && (
            <span
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
