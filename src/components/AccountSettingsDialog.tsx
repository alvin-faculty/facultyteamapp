"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { updateOwnName, changeOwnPassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AccountSettingsDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; email: string };
}) {
  const [name, setName] = useState(user.name);
  const [isNamePending, startNameTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordPending, startPasswordTransition] = useTransition();

  function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startNameTransition(async () => {
      try {
        await updateOwnName(trimmed);
        toast.success("Name updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update name");
      }
    });
  }

  function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    startPasswordTransition(async () => {
      try {
        await changeOwnPassword(currentPassword, newPassword);
        toast.success("Password changed");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to change password");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <div className="flex gap-2">
              <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={handleSaveName} disabled={isNamePending || !name.trim()}>
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <Separator />

          <form onSubmit={handleChangePassword} className="space-y-3">
            <p className="text-sm font-medium">Change password</p>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={isPasswordPending} className="w-full">
              Change password
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
