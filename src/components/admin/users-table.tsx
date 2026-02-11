"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { MoreHorizontal, Shield, UserCog, UserX, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditGroupsDialog } from "@/components/admin/edit-groups-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import type { UserResponse, GroupResponse } from "@/lib/types/api";

interface UsersTableProps {
  users: UserResponse[];
  groups: GroupResponse[];
  currentUserId: string;
  onMutate: () => void;
}

function StatusBadge({ user }: { user: UserResponse }) {
  if (!user.enabled) {
    return (
      <Badge variant="destructive" className="text-xs">
        Disabled
      </Badge>
    );
  }

  if (user.status === "FORCE_CHANGE_PASSWORD") {
    return (
      <Badge variant="secondary" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
        Pending
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs border-green-300 bg-green-50 text-green-700">
      Active
    </Badge>
  );
}

export function UsersTable({ users, groups, currentUserId, onMutate }: UsersTableProps) {
  const [editGroupsUser, setEditGroupsUser] = useState<UserResponse | null>(null);
  const [deleteUsername, setDeleteUsername] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  const handleToggleStatus = async (user: UserResponse) => {
    setTogglingStatus(user.username);

    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.username)}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !user.enabled }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update status");
      }

      onMutate();
    } catch (err) {
      console.error("Failed to toggle user status:", err);
    } finally {
      setTogglingStatus(null);
    }
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelf = user.username === currentUserId;

                return (
                  <TableRow key={user.username}>
                    <TableCell className="font-medium">
                      {user.username}
                      {isSelf && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge user={user} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.isAdmin && (
                          <Badge className="text-xs gap-1">
                            <Shield className="size-3" />
                            Admin
                          </Badge>
                        )}
                        {user.clientGroups.map((client) => (
                          <Badge key={client} variant="outline" className="text-xs">
                            {client}
                          </Badge>
                        ))}
                        {!user.isAdmin && user.clientGroups.length === 0 && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {user.createdAt
                        ? format(parseISO(user.createdAt), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditGroupsUser(user)}
                          >
                            <UserCog className="size-4" />
                            Edit Groups
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user)}
                            disabled={isSelf || togglingStatus === user.username}
                          >
                            {user.enabled ? (
                              <>
                                <UserX className="size-4" />
                                Disable
                              </>
                            ) : (
                              <>
                                <UserCheck className="size-4" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteUsername(user.username)}
                            disabled={isSelf}
                          >
                            <UserX className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EditGroupsDialog
        user={editGroupsUser}
        allGroups={groups}
        currentUserId={currentUserId}
        onClose={() => setEditGroupsUser(null)}
        onSuccess={onMutate}
      />

      <DeleteUserDialog
        username={deleteUsername}
        onClose={() => setDeleteUsername(null)}
        onSuccess={onMutate}
      />
    </>
  );
}
