import { NextResponse } from "next/server";
import { evaluateAlert } from "@/lib/aws/alerts-evaluate";
import type { AlertEvaluatePayload } from "@/lib/types/alerts";

export async function POST(request: Request) {
  try {
    // API key auth (not Cognito — called by EventBridge)
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.ALERT_EVALUATE_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as AlertEvaluatePayload;

    // Validate required fields
    if (
      !body.pipelineId ||
      !body.executionArn ||
      !body.executionStatus ||
      !body.stateMachineArn
    ) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Missing required fields: pipelineId, executionArn, executionStatus, stateMachineArn",
        },
        { status: 400 }
      );
    }

    const result = await evaluateAlert(body);

    return NextResponse.json(
      { message: "Evaluation complete", alertsSent: result.alertsSent },
      { status: 200 }
    );
  } catch (error) {
    console.error("[alerts/evaluate] Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
