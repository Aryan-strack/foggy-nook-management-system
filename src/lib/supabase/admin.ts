import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must NEVER be imported into
// client components or exposed to the browser. Only use it inside Next.js
// Route Handlers / Server Actions that themselves verify the caller's role.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
