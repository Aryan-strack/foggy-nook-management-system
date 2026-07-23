import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || (caller.role !== "super_admin" && caller.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, email, password, branch_id } = body as {
    full_name: string;
    email: string;
    password: string;
    branch_id: string;
  };

  if (!full_name || !email || !password || !branch_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "manager", branch_id },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // The DB trigger (handle_new_user) creates the profile row automatically.
  await supabase.from("activity_logs").insert({
    actor_id: user.id,
    branch_id,
    action: `Created Manager account for ${full_name}`,
    entity_type: "profile",
    entity_id: created.user?.id,
  });

  return NextResponse.json({ user: created.user });
}
