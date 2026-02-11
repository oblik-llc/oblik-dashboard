import {
  ListUsersCommand,
  ListGroupsCommand,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminDeleteUserCommand,
  AdminListGroupsForUserCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "./client";
import type { CognitoUser, CognitoGroup } from "@/lib/types/users";
import { AwsServiceError } from "@/lib/types/pipeline";

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

function getAttr(
  attrs: AttributeType[] | undefined,
  name: string
): string | undefined {
  return attrs?.find((a) => a.Name === name)?.Value;
}

export async function listGroupsForUser(username: string): Promise<string[]> {
  const client = getCognitoClient();

  try {
    const result = await client.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );

    return (result.Groups ?? []).map((g) => g.GroupName!);
  } catch (error) {
    throw new AwsServiceError("Cognito", "AdminListGroupsForUser", error);
  }
}

export async function listUsers(): Promise<CognitoUser[]> {
  const client = getCognitoClient();
  const allUsers: CognitoUser[] = [];
  let paginationToken: string | undefined;

  try {
    do {
      const result = await client.send(
        new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          Limit: 60,
          PaginationToken: paginationToken,
        })
      );

      const users = (result.Users ?? []).map((u) => ({
        username: u.Username!,
        email: getAttr(u.Attributes, "email") ?? "",
        status: u.UserStatus ?? "UNKNOWN",
        enabled: u.Enabled ?? false,
        createdAt: u.UserCreateDate?.toISOString() ?? "",
        lastModifiedAt: u.UserLastModifiedDate?.toISOString() ?? "",
        groups: [] as string[],
      }));

      allUsers.push(...users);
      paginationToken = result.PaginationToken;
    } while (paginationToken);
  } catch (error) {
    throw new AwsServiceError("Cognito", "ListUsers", error);
  }

  // Fetch groups for each user (batched concurrency of 10)
  const batchSize = 10;
  for (let i = 0; i < allUsers.length; i += batchSize) {
    const batch = allUsers.slice(i, i + batchSize);
    const groupResults = await Promise.all(
      batch.map((u) => listGroupsForUser(u.username))
    );
    batch.forEach((u, idx) => {
      u.groups = groupResults[idx];
    });
  }

  return allUsers;
}

export async function listGroups(): Promise<CognitoGroup[]> {
  const client = getCognitoClient();
  const allGroups: CognitoGroup[] = [];
  let nextToken: string | undefined;

  try {
    do {
      const result = await client.send(
        new ListGroupsCommand({
          UserPoolId: USER_POOL_ID,
          Limit: 60,
          NextToken: nextToken,
        })
      );

      const groups = (result.Groups ?? []).map((g) => ({
        name: g.GroupName!,
        description: g.Description ?? null,
      }));

      allGroups.push(...groups);
      nextToken = result.NextToken;
    } while (nextToken);
  } catch (error) {
    throw new AwsServiceError("Cognito", "ListGroups", error);
  }

  return allGroups;
}

export async function getUser(
  username: string
): Promise<CognitoUser | null> {
  const client = getCognitoClient();

  try {
    const result = await client.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );

    const groups = await listGroupsForUser(username);

    return {
      username: result.Username!,
      email: getAttr(result.UserAttributes, "email") ?? "",
      status: result.UserStatus ?? "UNKNOWN",
      enabled: result.Enabled ?? false,
      createdAt: result.UserCreateDate?.toISOString() ?? "",
      lastModifiedAt: result.UserLastModifiedDate?.toISOString() ?? "",
      groups,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "UserNotFoundException"
    ) {
      return null;
    }
    throw new AwsServiceError("Cognito", "AdminGetUser", error);
  }
}

export async function createUser(
  username: string,
  email: string
): Promise<CognitoUser> {
  const client = getCognitoClient();

  try {
    const result = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
        DesiredDeliveryMediums: ["EMAIL"],
      })
    );

    const user = result.User!;

    return {
      username: user.Username!,
      email: getAttr(user.Attributes, "email") ?? email,
      status: user.UserStatus ?? "FORCE_CHANGE_PASSWORD",
      enabled: user.Enabled ?? true,
      createdAt: user.UserCreateDate?.toISOString() ?? new Date().toISOString(),
      lastModifiedAt:
        user.UserLastModifiedDate?.toISOString() ?? new Date().toISOString(),
      groups: [],
    };
  } catch (error) {
    // Let UsernameExistsException bubble up so API can return 409
    if (
      error instanceof Error &&
      error.name === "UsernameExistsException"
    ) {
      throw error;
    }
    throw new AwsServiceError("Cognito", "AdminCreateUser", error);
  }
}

export async function addUserToGroup(
  username: string,
  groupName: string
): Promise<void> {
  const client = getCognitoClient();

  try {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName,
      })
    );
  } catch (error) {
    throw new AwsServiceError("Cognito", "AdminAddUserToGroup", error);
  }
}

export async function removeUserFromGroup(
  username: string,
  groupName: string
): Promise<void> {
  const client = getCognitoClient();

  try {
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName,
      })
    );
  } catch (error) {
    throw new AwsServiceError("Cognito", "AdminRemoveUserFromGroup", error);
  }
}

export async function disableUser(username: string): Promise<void> {
  const client = getCognitoClient();

  try {
    await client.send(
      new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
  } catch (error) {
    throw new AwsServiceError("Cognito", "AdminDisableUser", error);
  }
}

export async function enableUser(username: string): Promise<void> {
  const client = getCognitoClient();

  try {
    await client.send(
      new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
  } catch (error) {
    throw new AwsServiceError("Cognito", "AdminEnableUser", error);
  }
}

export async function deleteUser(username: string): Promise<void> {
  const client = getCognitoClient();

  try {
    await client.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
  } catch (error) {
    throw new AwsServiceError("Cognito", "AdminDeleteUser", error);
  }
}
