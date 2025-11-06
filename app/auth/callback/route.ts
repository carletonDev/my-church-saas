/**
 * Auth Callback Route Handler
 *
 * Handles OAuth redirects and magic link authentication.
 * Exchanges the auth code for a session and syncs user to database.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserToDatabase } from "@/actions/auth.actions";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_error`);
    }

    if (data.user) {
      // Sync user to Prisma database
      const syncResult = await syncUserToDatabase(
        data.user.id,
        data.user.email!,
        data.user.user_metadata?.name || data.user.user_metadata?.full_name
      );

      if (!syncResult.success) {
        console.error("Error syncing user to database:", syncResult.error);
        // Continue anyway - user is authenticated in Supabase
      }
    }

    // Redirect to the next URL
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
