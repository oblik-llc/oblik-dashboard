"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Bell, CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAlertPreferences } from "@/hooks/use-alert-preferences";
import { useAlertHistory } from "@/hooks/use-alert-history";
import type {
  AlertPreferencesUpdateRequest,
  TestAlertResponse,
} from "@/lib/types/api";

export default function AlertsPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = decodeURIComponent(params.pipelineId);
  const { data: session } = useSession();
  const isAdmin = session?.user?.groups?.includes("Admin") ?? false;

  const { preferences, isLoading, mutate } = useAlertPreferences(pipelineId);
  const { history, isLoading: historyLoading, mutate: mutateHistory } = useAlertHistory(pipelineId);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookChanged, setWebhookChanged] = useState(false);
  const [onFailure, setOnFailure] = useState(true);
  const [consecutiveEnabled, setConsecutiveEnabled] = useState(false);
  const [consecutiveThreshold, setConsecutiveThreshold] = useState(3);
  const [onRecovery, setOnRecovery] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestAlertResponse["results"] | null>(null);

  // Sync form state from loaded preferences
  useEffect(() => {
    if (preferences) {
      setEnabled(preferences.enabled);
      setEmailEnabled(preferences.channels.email.enabled);
      setSlackEnabled(preferences.channels.slack.enabled);
      setOnFailure(preferences.triggers.onFailure);
      setConsecutiveEnabled(preferences.triggers.onConsecutiveFailures.enabled);
      setConsecutiveThreshold(preferences.triggers.onConsecutiveFailures.threshold);
      setOnRecovery(preferences.triggers.onRecovery);
      // Don't overwrite webhook URL if user has been editing it
      if (!webhookChanged) {
        setWebhookUrl("");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <ShieldAlert className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium text-lg">Admin access required</p>
            <p className="text-sm text-muted-foreground mt-1">
              Alert configuration is only available to administrators.
            </p>
          </div>
          <Link
            href={`/pipelines/${encodeURIComponent(pipelineId)}`}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Back to pipeline
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const body: AlertPreferencesUpdateRequest = {
      enabled,
      channels: {
        email: { enabled: emailEnabled },
        slack: {
          enabled: slackEnabled,
          ...(webhookChanged ? { webhookUrl } : {}),
        },
      },
      triggers: {
        onFailure,
        onConsecutiveFailures: {
          enabled: consecutiveEnabled,
          threshold: consecutiveThreshold,
        },
        onRecovery,
      },
    };

    try {
      const res = await fetch(
        `/api/pipelines/${encodeURIComponent(pipelineId)}/alerts`,
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

      setWebhookChanged(false);
      setWebhookUrl("");
      await mutate();
      setSaveMessage({ type: "success", text: "Preferences saved" });
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);

    try {
      const res = await fetch(
        `/api/pipelines/${encodeURIComponent(pipelineId)}/alerts/test`,
        { method: "POST" }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send test");
      }

      const data = (await res.json()) as TestAlertResponse;
      setTestResults(data.results);
      await mutateHistory();
    } catch (error) {
      setTestResults([
        {
          channel: "all",
          success: false,
          error: error instanceof Error ? error.message : "Failed to send test",
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Alert Settings</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{pipelineId}</p>
        </div>
        <Link
          href={`/pipelines/${encodeURIComponent(pipelineId)}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to pipeline
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Master Toggle */}
          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when pipeline executions fail or recover
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {enabled && (
            <>
              {/* Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>Channels</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email (via SNS)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sends to the pipeline&apos;s SNS topic subscribers
                      </p>
                    </div>
                    <Switch
                      checked={emailEnabled}
                      onCheckedChange={setEmailEnabled}
                    />
                  </div>

                  <div className="border-t" />

                  {/* Slack */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Slack</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Post alerts to a Slack channel via webhook
                        </p>
                      </div>
                      <Switch
                        checked={slackEnabled}
                        onCheckedChange={setSlackEnabled}
                      />
                    </div>

                    {slackEnabled && (
                      <div className="space-y-1.5 pl-1">
                        <Label htmlFor="webhook-url" className="text-xs">
                          Webhook URL
                          {preferences?.channels.slack.isConfigured && !webhookChanged && (
                            <span className="text-muted-foreground ml-1.5">
                              (configured: {preferences.channels.slack.webhookUrl})
                            </span>
                          )}
                        </Label>
                        <Input
                          id="webhook-url"
                          type="password"
                          placeholder="https://hooks.slack.com/services/..."
                          value={webhookUrl}
                          onChange={(e) => {
                            setWebhookUrl(e.target.value);
                            setWebhookChanged(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Triggers */}
              <Card>
                <CardHeader>
                  <CardTitle>Triggers</CardTitle>
                  <CardDescription>Configure which events trigger alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>On failure</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alert when any execution fails
                      </p>
                    </div>
                    <Switch
                      checked={onFailure}
                      onCheckedChange={setOnFailure}
                    />
                  </div>

                  <div className="border-t" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>On consecutive failures</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Alert after multiple failures in a row
                        </p>
                      </div>
                      <Switch
                        checked={consecutiveEnabled}
                        onCheckedChange={setConsecutiveEnabled}
                      />
                    </div>

                    {consecutiveEnabled && (
                      <div className="flex items-center gap-2 pl-1">
                        <Label htmlFor="threshold" className="text-xs whitespace-nowrap">
                          Threshold
                        </Label>
                        <Input
                          id="threshold"
                          type="number"
                          min={2}
                          max={10}
                          className="w-20"
                          value={consecutiveThreshold}
                          onChange={(e) =>
                            setConsecutiveThreshold(
                              Math.min(10, Math.max(2, parseInt(e.target.value) || 2))
                            )
                          }
                        />
                        <span className="text-xs text-muted-foreground">consecutive failures</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t" />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>On recovery</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alert when a pipeline succeeds after a failure
                      </p>
                    </div>
                    <Switch
                      checked={onRecovery}
                      onCheckedChange={setOnRecovery}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save Preferences
            </Button>
            {saveMessage && (
              <span
                className={`text-sm ${
                  saveMessage.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {saveMessage.text}
              </span>
            )}
          </div>

          {/* Test Alert */}
          {enabled && (emailEnabled || slackEnabled) && (
            <Card>
              <CardHeader>
                <CardTitle>Test Alert</CardTitle>
                <CardDescription>
                  Send a test message to all enabled channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing && <Loader2 className="size-4 animate-spin" />}
                  Send Test Alert
                </Button>

                {testResults && (
                  <div className="space-y-1.5">
                    {testResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {r.success ? (
                          <CheckCircle2 className="size-4 text-green-600" />
                        ) : (
                          <XCircle className="size-4 text-red-500" />
                        )}
                        <span className="capitalize">{r.channel}</span>
                        {r.error && (
                          <span className="text-muted-foreground">
                            — {r.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>Recent alerts sent for this pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !history?.entries.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No alerts have been sent yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.entries.map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(entry.sentAt), "MMM d, h:mm:ss a")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.alertType === "recovery"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {entry.alertType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.channel}</Badge>
                        </TableCell>
                        <TableCell>
                          {entry.success ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                              <span className="size-1.5 rounded-full bg-green-500" />
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
                              <span className="size-1.5 rounded-full bg-red-500" />
                              Failed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
