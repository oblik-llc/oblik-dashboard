"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Users, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "@/hooks/use-users";
import { UsersTable } from "@/components/admin/users-table";
import { InviteUserDialog } from "@/components/admin/invite-user-dialog";

export default function UserManagementPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.groups?.includes("Admin") ?? false;
  const currentUserId = session?.user?.id ?? "";

  const { users, groups, isLoading, error, mutate } = useUsers();

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <ShieldAlert className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium text-lg">Admin access required</p>
            <p className="text-sm text-muted-foreground mt-1">
              User management is only available to administrators.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Back to pipelines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">
            User Management
          </h1>
        </div>
        <InviteUserDialog onSuccess={() => mutate()} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive">
            Failed to load users. Please try again.
          </p>
        </div>
      ) : (
        <UsersTable
          users={users ?? []}
          groups={groups ?? []}
          currentUserId={currentUserId}
          onMutate={() => mutate()}
        />
      )}
    </div>
  );
}
