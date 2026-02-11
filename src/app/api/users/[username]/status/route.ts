import { NextResponse } from "next/server";
import { getUser, enableUser, disableUser } from "@/lib/aws/cognito";
import { requireAuth, isAdmin, handleAwsError } from "@/lib/api/helpers";
import type { UpdateUserStatusRequest } from "@/lib/types/api";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult.errorResponse;
    const { session } = authResult;

    if (!isAdmin(session.user.groups)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { username } = await params;
    const body = (await request.json()) as UpdateUserStatusRequest;

    // Prevent self-disable
    if (username === session.user.id && !body.enabled) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "You cannot disable your own account",
        },
        { status: 400 }
      );
    }

    const user = await getUser(username);
    if (!user) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found" },
        { status: 404 }
      );
    }

    if (body.enabled) {
      await enableUser(username);
    } else {
      await disableUser(username);
    }

    return NextResponse.json({
      message: `User ${body.enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    return handleAwsError(error);
  }
}
