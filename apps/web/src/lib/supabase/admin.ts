import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client -- bypasses RLS entirely. Only use this in server-only
// code that performs its own authorization check instead of relying on RLS.
// Currently used solely by the public /share/[token] route, which authorizes
// via the unguessable share_token itself rather than a user session. Never
// import this into a client component or any authenticated-user code path --
// every other part of the app uses the user-scoped client in server.ts so
// RLS stays the enforcement boundary.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
