import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/aws/dynamodb";
import {
  getAlertPreferences,
  putAlertPreferences,
} from "@/lib/aws/alerts-db";
import {
  requireAuth,
  isAdmin,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type {
  AlertPreferencesResponse,
  AlertPreferencesUpdateRequest,
} from "@/lib/types/api";
import type { AlertPreferences } from "@/lib/types/alerts";

function maskWebhookUrl(url?: string): string | null {
  if (!url) return null;
  if (url.length <= 4) return "****";
  return "****" + url.slice(-4);
}

function defaultPreferences(pipelineId: string): AlertPreferencesResponse {
  return {
    pipelineId,
    enabled: false,
    channels: {
      email: { enabled: false },
      slack: { enabled: false, webhookUrl: null, isConfigured: false },
    },
    triggers: {
      onFailure: true,
      onConsecutiveFailures: { enabled: false, threshold: 3 },
      onRecovery: true,
    },
  };
}

function toResponse(prefs: AlertPreferences): AlertPreferencesResponse {
  return {
    pipelineId: prefs.pipeline_id,
    enabled: prefs.enabled,
    channels: {
      email: { enabled: prefs.channels.email.enabled },
      slack: {
        enabled: prefs.channels.slack.enabled,
        webhookUrl: maskWebhookUrl(prefs.channels.slack.webhookUrl),
        isConfigured: !!prefs.channels.slack.webhookUrl,
      },
    },
    triggers: prefs.triggers,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can manage alerts" },
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

    const prefs = await getAlertPreferences(pipelineId);
    const response = prefs ? toResponse(prefs) : defaultPreferences(pipelineId);

    return NextResponse.json(response);
  } catch (error) {
    return handleAwsError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can manage alerts" },
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

    const body = (await request.json()) as AlertPreferencesUpdateRequest;

    // Validate threshold
    const threshold = body.triggers?.onConsecutiveFailures?.threshold;
    if (threshold !== undefined && (threshold < 2 || threshold > 10)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Consecutive failures threshold must be between 2 and 10" },
        { status: 400 }
      );
    }

    // Merge webhook URL: omitted = preserve existing, empty string = clear
    const existing = await getAlertPreferences(pipelineId);
    let webhookUrl: string | undefined;
    if (body.channels.slack.webhookUrl !== undefined) {
      webhookUrl = body.channels.slack.webhookUrl || undefined;
    } else {
      webhookUrl = existing?.channels.slack.webhookUrl;
    }

    const prefs: AlertPreferences = {
      pipeline_id: pipelineId,
      enabled: body.enabled,
      channels: {
        email: { enabled: body.channels.email.enabled },
        slack: { enabled: body.channels.slack.enabled, webhookUrl },
      },
      triggers: body.triggers,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.email ?? session.user.id ?? "unknown",
    };

    await putAlertPreferences(prefs);

    return NextResponse.json(toResponse(prefs));
  } catch (error) {
    return handleAwsError(error);
  }
}
