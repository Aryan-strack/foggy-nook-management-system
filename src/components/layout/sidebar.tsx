"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAppStore } from "@/store/app-store";

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAppStore((s) => s.profile);
  const role = profile?.role ?? "manager";
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const bestMatch = items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-display text-sm font-bold">
          F
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-semibold">Foggy Nook</span>
          <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
            Shop Manager
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = item.href === bestMatch?.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40">
          v1.0 &middot; {profile?.branch?.name ?? "All Branches"}
        </p>
      </div>
    </aside>
  );
}
