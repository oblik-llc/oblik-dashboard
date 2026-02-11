import { NextResponse } from "next/server";
import { getUser, deleteUser } from "@/lib/aws/cognito";
import { requireAuth, isAdmin, handleAwsError } from "@/lib/api/helpers";

export async function DELETE(
  _request: Request,
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

    // Prevent self-deletion
    if (username === session.user.id) {
      return NextResponse.json(
        { error: "Bad Request", message: "You cannot delete your own account" },
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

    await deleteUser(username);

    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    return handleAwsError(error);
  }
}
