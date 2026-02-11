import { NextResponse } from "next/server";
import { listUsers, listGroups, createUser } from "@/lib/aws/cognito";
import { requireAuth, isAdmin, handleAwsError } from "@/lib/api/helpers";
import type {
  UsersListResponse,
  UserResponse,
  InviteUserRequest,
  InviteUserResponse,
} from "@/lib/types/api";
import type { CognitoUser } from "@/lib/types/users";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,50}$/;

function toUserResponse(user: CognitoUser): UserResponse {
  return {
    ...user,
    isAdmin: user.groups.includes("Admin"),
    clientGroups: user.groups
      .filter((g) => g.startsWith("client:"))
      .map((g) => g.slice("client:".length)),
  };
}

export async function GET() {
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

    const [users, groups] = await Promise.all([listUsers(), listGroups()]);

    const body: UsersListResponse = {
      users: users.map(toUserResponse),
      groups: groups.map((g) => ({ name: g.name, description: g.description })),
    };

    return NextResponse.json(body);
  } catch (error) {
    return handleAwsError(error);
  }
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as InviteUserRequest;

    // Validate username
    if (!body.username || !USERNAME_REGEX.test(body.username)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message:
            "Username must be 2-50 characters and contain only letters, numbers, hyphens, and underscores. Do not use an email address.",
        },
        { status: 400 }
      );
    }

    // Validate email
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Bad Request", message: "A valid email address is required" },
        { status: 400 }
      );
    }

    const user = await createUser(body.username, body.email);

    const response: InviteUserResponse = {
      username: user.username,
      email: user.email,
      temporaryPassword: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "UsernameExistsException") {
      return NextResponse.json(
        { error: "Conflict", message: "A user with this username already exists" },
        { status: 409 }
      );
    }
    return handleAwsError(error);
  }
}
