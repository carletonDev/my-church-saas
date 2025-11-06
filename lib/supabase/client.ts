/**
 * Supabase Client-Side Client
 * 
 * This client is used in Client Components and respects Row Level Security (RLS).
 * Uses the anon key which has limited permissions defined by RLS policies.
 * 
 * Usage:
 * - Client Components (components with 'use client')
 * - Browser-side operations
 * - Real-time subscriptions
 * 
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client for browser usage
 * This client respects RLS policies
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
