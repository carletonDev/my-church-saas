/**
 * Supabase Server-Side Client
 * 
 * This client is used in Server Components, Server Actions, and Route Handlers.
 * It respects Row Level Security (RLS) when using the anon key.
 * 
 * Usage:
 * - Server Components
 * - Server Actions
 * - API Route Handlers
 * 
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for server-side usage in Server Components
 * This client respects RLS policies and maintains the user's auth session
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client with service role permissions
 * BYPASSES RLS - Use with caution and only in Server Actions/API Routes
 * 
 * @returns Supabase client with admin privileges
 * 
 * @example
 * // Use for privileged operations in Server Actions
 * const supabase = createAdminClient();
 * await supabase.from('users').insert({ ... });
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for admin client
        },
      },
    }
  );
}

/**
 * Gets the current authenticated user from the server
 * 
 * @returns User object or null if not authenticated
 * 
 * @example
 * const user = await getCurrentUser();
 * if (!user) {
 *   redirect('/login');
 * }
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Gets the current user's session
 * 
 * @returns Session object or null if not authenticated
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
