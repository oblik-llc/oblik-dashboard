"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserResponse, GroupResponse } from "@/lib/types/api";

interface EditGroupsDialogProps {
  user: UserResponse | null;
  allGroups: GroupResponse[];
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditGroupsDialog({
  user,
  allGroups,
  currentUserId,
  onClose,
  onSuccess,
}: EditGroupsDialogProps) {
  const [groupState, setGroupState] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = user?.username === currentUserId;

  useEffect(() => {
    if (user) {
      const state: Record<string, boolean> = {};
      for (const group of allGroups) {
        state[group.name] = user.groups.includes(group.name);
      }
      setGroupState(state);
      setError(null);
    }
  }, [user, allGroups]);

  const handleSave = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const addGroups: string[] = [];
    const removeGroups: string[] = [];

    for (const group of allGroups) {
      const wasInGroup = user.groups.includes(group.name);
      const isNowInGroup = groupState[group.name];

      if (!wasInGroup && isNowInGroup) addGroups.push(group.name);
      if (wasInGroup && !isNowInGroup) removeGroups.push(group.name);
    }

    if (addGroups.length === 0 && removeGroups.length === 0) {
      onClose();
      return;
    }

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}/groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addGroups, removeGroups }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update groups");
      }

      onClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update groups");
    } finally {
      setSubmitting(false);
    }
  };

  const adminGroup = allGroups.find((g) => g.name === "Admin");
  const clientGroups = allGroups.filter((g) => g.name.startsWith("client:"));
  const otherGroups = allGroups.filter(
    (g) => g.name !== "Admin" && !g.name.startsWith("client:")
  );

  return (
    <AlertDialog open={!!user} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Groups</AlertDialogTitle>
          <AlertDialogDescription>
            Manage group membership for <strong>{user?.username}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-5 py-2">
          {adminGroup && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Admin</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Full access to all pipelines and settings
                </p>
              </div>
              <Switch
                checked={groupState["Admin"] ?? false}
                disabled={isSelf}
                onCheckedChange={(checked) =>
                  setGroupState((prev) => ({ ...prev, Admin: checked }))
                }
              />
            </div>
          )}

          {clientGroups.length > 0 && (
            <>
              <div className="border-t" />
              <div className="space-y-3">
                <p className="text-sm font-medium">Client Groups</p>
                {clientGroups.map((group) => {
                  const clientName = group.name.slice("client:".length);
                  return (
                    <div
                      key={group.name}
                      className="flex items-center justify-between"
                    >
                      <Label className="text-sm">{clientName}</Label>
                      <Switch
                        checked={groupState[group.name] ?? false}
                        onCheckedChange={(checked) =>
                          setGroupState((prev) => ({
                            ...prev,
                            [group.name]: checked,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {otherGroups.length > 0 && (
            <>
              <div className="border-t" />
              <div className="space-y-3">
                <p className="text-sm font-medium">Other Groups</p>
                {otherGroups.map((group) => (
                  <div
                    key={group.name}
                    className="flex items-center justify-between"
                  >
                    <Label className="text-sm">{group.name}</Label>
                    <Switch
                      checked={groupState[group.name] ?? false}
                      onCheckedChange={(checked) =>
                        setGroupState((prev) => ({
                          ...prev,
                          [group.name]: checked,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {isSelf && (
            <p className="text-xs text-muted-foreground">
              You cannot remove yourself from the Admin group.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
