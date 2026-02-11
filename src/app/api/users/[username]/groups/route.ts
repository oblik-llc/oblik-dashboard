import { NextResponse } from "next/server";
import {
  getUser,
  addUserToGroup,
  removeUserFromGroup,
  listGroupsForUser,
} from "@/lib/aws/cognito";
import { requireAuth, isAdmin, handleAwsError } from "@/lib/api/helpers";
import type {
  UpdateUserGroupsRequest,
  UpdateUserGroupsResponse,
} from "@/lib/types/api";

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
    const body = (await request.json()) as UpdateUserGroupsRequest;

    // Prevent removing self from Admin
    if (
      username === session.user.id &&
      body.removeGroups?.includes("Admin")
    ) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "You cannot remove yourself from the Admin group",
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

    // Process additions
    if (body.addGroups?.length) {
      await Promise.all(
        body.addGroups.map((g) => addUserToGroup(username, g))
      );
    }

    // Process removals
    if (body.removeGroups?.length) {
      await Promise.all(
        body.removeGroups.map((g) => removeUserFromGroup(username, g))
      );
    }

    const updatedGroups = await listGroupsForUser(username);

    const response: UpdateUserGroupsResponse = {
      username,
      groups: updatedGroups,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleAwsError(error);
  }
}
