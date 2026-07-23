"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, BellIcon, LogOutIcon, UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/mobile-nav";
import Link from "next/link";

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
};

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const branches = useAppStore((s) => s.branches);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const setActiveBranchId = useAppStore((s) => s.setActiveBranchId);

  const title =
    NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "";

  const canSwitchBranch = profile?.role === "super_admin" || profile?.role === "admin";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        {title && <h1 className="font-display text-lg font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {canSwitchBranch && (
          <Select
            value={activeBranchId ?? "all"}
            onValueChange={(v) => setActiveBranchId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <SunIcon className="hidden size-4 dark:block" />
          <MoonIcon className="block size-4 dark:hidden" />
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="Notifications">
          <Link href="/notifications">
            <BellIcon className="size-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md pl-1 pr-2 py-1 hover:bg-secondary">
              <Avatar className="size-7">
                <AvatarFallback>{initials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start leading-tight sm:flex">
                <span className="text-xs font-medium">{profile?.full_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {profile ? ROLE_LABEL[profile.role] : ""}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOutIcon /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
