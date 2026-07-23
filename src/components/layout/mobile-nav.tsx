"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const profile = useAppStore((s) => s.profile);
  const role = profile?.role ?? "manager";
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const bestMatch = items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <MenuIcon className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="left-0 top-0 h-full max-h-full w-64 max-w-64 translate-x-0 translate-y-0 rounded-none border-r bg-sidebar text-sidebar-foreground p-0">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-display text-sm font-bold">
              F
            </div>
            <span className="font-display text-[15px] font-semibold">Foggy Nook</span>
          </div>
          <nav className="px-3 py-2">
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = item.href === bestMatch?.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
