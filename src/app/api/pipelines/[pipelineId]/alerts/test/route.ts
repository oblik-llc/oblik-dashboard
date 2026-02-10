import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import { getAlertPreferences, putAlertHistoryEntry } from "@/lib/aws/alerts-db";
import { sendEmailAlert, sendSlackAlert } from "@/lib/aws/alerts-delivery";
import {
  requireAuth,
  isAdmin,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { TestAlertResponse } from "@/lib/types/api";
import type { AlertHistoryEntry } from "@/lib/types/alerts";

// In-memory rate limit: 60s cooldown per pipeline
const lastTestTime = new Map<string, number>();
const COOLDOWN_MS = 60_000;
const TTL_DAYS = 90;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can test alerts" },
        { status: 403 }
      );
    }

    const { pipelineId: rawId } = await params;
    const pipelineId = decodeURIComponent(rawId);

    const pipeline = await getPipeline(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(pipeline.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Rate limit
    const now = Date.now();
    const lastTest = lastTestTime.get(pipelineId);
    if (lastTest && now - lastTest < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - (now - lastTest)) / 1000);
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Please wait ${retryAfter}s before testing again`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const prefs = await getAlertPreferences(pipelineId);
    if (!prefs) {
      return NextResponse.json(
        { error: "Bad Request", message: "No alert preferences configured. Save preferences first." },
        { status: 400 }
      );
    }

    const testMessage = `This is a test alert from the Oblik Dashboard for pipeline *${pipelineId}*.`;
    const results: { channel: string; success: boolean; error?: string }[] = [];

    if (prefs.channels.email.enabled) {
      try {
        await sendEmailAlert(
          pipeline.sns_topic_arn,
          `[TEST] Oblik Alert — ${pipelineId}`,
          testMessage
        );
        results.push({ channel: "email", success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        results.push({ channel: "email", success: false, error: msg });
      }
    }

    if (prefs.channels.slack.enabled && prefs.channels.slack.webhookUrl) {
      try {
        await sendSlackAlert(
          prefs.channels.slack.webhookUrl,
          testMessage,
          pipelineId,
          "failure"
        );
        results.push({ channel: "slack", success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        results.push({ channel: "slack", success: false, error: msg });
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "No channels are enabled" },
        { status: 400 }
      );
    }

    // Record test in history
    for (const r of results) {
      const entry: AlertHistoryEntry = {
        pipeline_id: pipelineId,
        sent_at: new Date().toISOString(),
        alertType: "failure",
        channel: r.channel as "email" | "slack",
        success: r.success,
        errorMessage: r.error,
        message: `[TEST] ${testMessage}`,
        ttl: Math.floor(Date.now() / 1000) + TTL_DAYS * 86400,
      };
      await putAlertHistoryEntry(entry);
    }

    lastTestTime.set(pipelineId, Date.now());

    const response: TestAlertResponse = { results };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleAwsError(error);
  }
}
