"use client";

import * as React from "react";
import { Loader2Icon, KeyRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
};

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const profile = useAppStore((s) => s.profile);
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handlePasswordChange() {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Could not update password", { description: error.message });
      return;
    }
    setPassword("");
    toast.success("Password updated");
  }

  if (!profile) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Profile" description="Your account details and security." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-lg font-semibold">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="gold">{ROLE_LABEL[profile.role]}</Badge>
              {profile.branch && <Badge variant="secondary">{profile.branch.name}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <div className="flex items-center gap-2">
              <KeyRoundIcon className="size-4 text-accent" />
              <h3 className="font-display font-semibold">Change Password</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <Button variant="gold" onClick={handlePasswordChange} disabled={saving} className="self-start">
              {saving && <Loader2Icon className="animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
