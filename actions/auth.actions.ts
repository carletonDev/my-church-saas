/**
 * Authentication Server Actions
 *
 * Handles user authentication, registration, and organization creation.
 * Syncs Supabase Auth users with Prisma database.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { ActionResponse } from "@/types";

/**
 * Signs up a new user and creates their organization
 *
 * @param email - User's email
 * @param password - User's password
 * @param name - User's name
 * @param organizationName - Organization name
 * @returns Action response with user ID and organization ID
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  organizationName: string
): Promise<ActionResponse<{ userId: string; organizationId: string }>> {
  try {
    const supabase = await createClient();

    // Generate unique organization slug
    const baseSlug = slugify(organizationName);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and generate a unique one
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user" };
    }

    // Create organization and user in Prisma database
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        slug,
        maxMembers: 50, // Default limit
        users: {
          create: {
            id: authData.user.id, // Use Supabase user ID
            email,
            name,
            role: "OWNER", // First user is always the owner
          },
        },
      },
    });

    return {
      success: true,
      data: {
        userId: authData.user.id,
        organizationId: organization.id,
      },
    };
  } catch (error) {
    console.error("Error signing up:", error);
    return {
      success: false,
      error: "Failed to create account. Please try again.",
    };
  }
}

/**
 * Signs in a user with email and password
 *
 * @param email - User's email
 * @param password - User's password
 * @returns Action response
 */
export async function signIn(
  email: string,
  password: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidate and redirect
    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (error) {
    // If redirect throws (which is expected), re-throw it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("Error signing in:", error);
    return {
      success: false,
      error: "Failed to sign in. Please try again.",
    };
  }
}

/**
 * Sends a magic link to the user's email
 *
 * @param email - User's email
 * @returns Action response
 */
export async function signInWithMagicLink(
  email: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = process.env.NEXT_PUBLIC_APP_URL || headersList.get("origin") || "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending magic link:", error);
    return {
      success: false,
      error: "Failed to send magic link. Please try again.",
    };
  }
}

/**
 * Signs out the current user
 *
 * @returns Action response
 */
export async function signOut(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidate and redirect
    revalidatePath("/", "layout");
    redirect("/login");
  } catch (error) {
    // If redirect throws (which is expected), re-throw it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("Error signing out:", error);
    return {
      success: false,
      error: "Failed to sign out. Please try again.",
    };
  }
}

/**
 * Syncs a Supabase Auth user to the Prisma database
 * Called after successful OAuth or magic link authentication
 *
 * @param userId - Supabase user ID
 * @param email - User's email
 * @param name - User's name (optional)
 * @param organizationName - Organization name for new users (optional)
 * @returns Action response
 */
export async function syncUserToDatabase(
  userId: string,
  email: string,
  name?: string,
  organizationName?: string
): Promise<ActionResponse<{ organizationId: string }>> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (existingUser) {
      // User already synced
      return {
        success: true,
        data: { organizationId: existingUser.organizationId },
      };
    }

    // New user - create organization and user
    const orgName = organizationName || `${name || email}'s Organization`;
    const baseSlug = slugify(orgName);
    let slug = baseSlug;
    let counter = 1;

    // Generate unique slug
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
        maxMembers: 50,
        users: {
          create: {
            id: userId,
            email,
            name,
            role: "OWNER",
          },
        },
      },
    });

    return {
      success: true,
      data: { organizationId: organization.id },
    };
  } catch (error) {
    console.error("Error syncing user to database:", error);
    return {
      success: false,
      error: "Failed to sync user data. Please try again.",
    };
  }
}

/**
 * Checks if an organization slug is available
 *
 * @param slug - Slug to check
 * @returns Action response with availability status
 */
export async function checkSlugAvailability(
  slug: string
): Promise<ActionResponse<{ available: boolean }>> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { slug },
    });

    return {
      success: true,
      data: { available: !organization },
    };
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return {
      success: false,
      error: "Failed to check slug availability.",
    };
  }
}
