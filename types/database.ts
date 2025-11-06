/**
 * Database Type Definitions
 * 
 * Placeholder for Supabase-generated database types
 * Generate real types with: npx supabase gen types typescript --project-id your-project-id
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
}
