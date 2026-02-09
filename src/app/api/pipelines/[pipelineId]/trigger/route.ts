import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPipeline } from "@/lib/aws/dynamodb";
import { isCurrentlyRunning, startExecution } from "@/lib/aws/stepfunctions";
import {
  requireAuth,
  isAdmin,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { TriggerSyncResponse } from "@/lib/types/api";

// In-memory rate limit: 60s cooldown per pipeline
const lastTriggerTime = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Admin check
    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can trigger syncs" },
        { status: 403 }
      );
    }

    // 3. Decode pipeline ID
    const { pipelineId: rawId } = await params;
    const pipelineId = decodeURIComponent(rawId);

    // 4. Fetch pipeline
    const pipeline = await getPipeline(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // 5. Multi-tenant check (defense-in-depth)
    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(pipeline.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Pipeline not found" },
        { status: 404 }
      );
    }

    // 6. Pipeline must be enabled
    if (!pipeline.enabled) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Cannot trigger a disabled pipeline",
        },
        { status: 400 }
      );
    }

    // 7. Rate limit (60s cooldown per pipeline)
    const now = Date.now();
    const lastTrigger = lastTriggerTime.get(pipelineId);
    if (lastTrigger && now - lastTrigger < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - (now - lastTrigger)) / 1000);
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Please wait ${retryAfter}s before triggering again`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // 8. Check if already running
    const running = await isCurrentlyRunning(pipeline.state_machine_arn);
    if (running) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "An execution is already running for this pipeline",
        },
        { status: 409 }
      );
    }

    // 9. Start execution with audit info
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const shortId = randomUUID().slice(0, 8);
    const executionName = `manual-${timestamp}-${shortId}`;

    const input = JSON.stringify({
      triggeredBy: session.user.email ?? session.user.id,
      triggeredAt: new Date().toISOString(),
      source: "dashboard",
    });

    const result = await startExecution({
      stateMachineArn: pipeline.state_machine_arn,
      name: executionName,
      input,
    });

    // 10. Record trigger time for rate limiting
    lastTriggerTime.set(pipelineId, Date.now());

    const body: TriggerSyncResponse = {
      executionArn: result.executionArn,
      executionName,
      startDate: result.startDate.toISOString(),
    };

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    return handleAwsError(error);
  }
}
