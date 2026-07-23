import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StoreHydrator } from "@/components/layout/store-hydrator";
import type { Profile, Branch } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, branch:branches(*)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: branches } = await supabase.from("branches").select("*").order("name");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <StoreHydrator
        profile={profile as unknown as Profile}
        branches={(branches ?? []) as Branch[]}
      />
    </div>
  );
}
