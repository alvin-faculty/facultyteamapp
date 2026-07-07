"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  inviteTeamMember,
  setTeamMemberDisabled,
  setTeamMemberRole,
  updateTeamMemberProfile,
} from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Profile, UserRole } from "@/lib/supabase/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  employee: "Employee",
};

function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Invite member
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                await inviteTeamMember(email.trim());
                toast.success("Invite sent");
                setEmail("");
                setOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to send invite");
              }
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isPending || !email.trim()} className="w-full">
            Send invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamMemberRow({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [name, setName] = useState(profile.name);
  const [hourlyRate, setHourlyRate] = useState(String(profile.hourly_rate));
  const [isPending, startTransition] = useTransition();

  function saveProfile() {
    const rate = parseFloat(hourlyRate);
    startTransition(async () => {
      try {
        await updateTeamMemberProfile(profile.id, name.trim(), Number.isFinite(rate) ? rate : 0);
        toast.success("Profile updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update profile");
      }
    });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-3 border-b py-3 last:border-0">
      <div className="col-span-3 space-y-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveProfile} />
        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          step="0.01"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          onBlur={saveProfile}
        />
      </div>
      <div className="col-span-3">
        <Select
          value={profile.role}
          items={ROLE_LABELS}
          disabled={isSelf || isPending}
          onValueChange={(v) =>
            v &&
            startTransition(async () => {
              try {
                await setTeamMemberRole(profile.id, v as UserRole);
                toast.success("Role updated");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update role");
              }
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4 flex items-center gap-2">
        <Checkbox
          checked={!profile.disabled}
          disabled={isSelf || isPending}
          onCheckedChange={(checked) =>
            startTransition(async () => {
              try {
                await setTeamMemberDisabled(profile.id, checked !== true);
                toast.success(checked ? "Account enabled" : "Account disabled");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update account");
              }
            })
          }
        />
        <span className="text-sm text-muted-foreground">
          {profile.disabled ? "Disabled" : "Active"}
        </span>
      </div>
    </div>
  );
}

export function TeamSettings({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  return (
    <div className="col-span-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <InviteMemberDialog />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="grid grid-cols-12 gap-3 border-b pb-2 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
          <span className="col-span-3">Name</span>
          <span className="col-span-2">Hourly rate</span>
          <span className="col-span-3">Role</span>
          <span className="col-span-4">Status</span>
        </div>
        {profiles.map((profile) => (
          <TeamMemberRow key={profile.id} profile={profile} isSelf={profile.id === currentUserId} />
        ))}
      </div>
    </div>
  );
}
