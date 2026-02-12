import { NextResponse } from "next/server";
import { getTransformationJob } from "@/lib/aws/transformation-db";
import { isCurrentlyRunning } from "@/lib/aws/stepfunctions";
import { triggerTransformationJob } from "@/lib/aws/eventbridge";
import {
  requireAuth,
  isAdmin,
  getClientFilter,
  handleAwsError,
} from "@/lib/api/helpers";
import type { TriggerTransformationResponse } from "@/lib/types/api";

// In-memory rate limit: 60s cooldown per job
const lastTriggerTime = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // 1. Authenticate
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    // 2. Admin check
    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can trigger transformations" },
        { status: 403 }
      );
    }

    // 3. Decode job ID
    const { jobId: rawId } = await params;
    const jobId = decodeURIComponent(rawId);

    // 4. Fetch job
    const job = await getTransformationJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Not Found", message: "Transformation job not found" },
        { status: 404 }
      );
    }

    // 5. Multi-tenant check (defense-in-depth)
    const allowedClients = getClientFilter(session.user.groups);
    if (allowedClients && !allowedClients.includes(job.client_name)) {
      return NextResponse.json(
        { error: "Not Found", message: "Transformation job not found" },
        { status: 404 }
      );
    }

    // 6. Job must be enabled
    if (!job.enabled) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Cannot trigger a disabled transformation job",
        },
        { status: 400 }
      );
    }

    // 7. Rate limit (60s cooldown per job)
    const now = Date.now();
    const lastTrigger = lastTriggerTime.get(jobId);
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

    // 8. Check if already running for this client's SFN
    const running = await isCurrentlyRunning(job.state_machine_arn);
    if (running) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "An execution is already running for this client",
        },
        { status: 409 }
      );
    }

    // 9. Trigger via EventBridge
    await triggerTransformationJob(
      job.client_name,
      [job.job_name],
      session.user.email ?? session.user.id
    );

    // 10. Record trigger time for rate limiting
    lastTriggerTime.set(jobId, Date.now());

    const body: TriggerTransformationResponse = {
      message: `Transformation job "${job.job_name}" triggered for ${job.client_name}`,
    };

    return NextResponse.json(body, { status: 202 });
  } catch (error) {
    return handleAwsError(error);
  }
}
