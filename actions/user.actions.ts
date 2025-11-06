/**
 * User Management Server Actions
 * 
 * Handles adding, removing, and updating users within an organization.
 * Automatically updates Stripe subscription using hybrid pricing model:
 * - Base fee: $19.99/month (always charged)
 * - First 50 seats: Free
 * - Tiered pricing for seats 51+
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { getStripeSubscriptionItems } from "@/lib/stripe/config";
import type { ActionResponse } from "@/types";
import { UserRole } from "@prisma/client";

/**
 * Adds a new user to the organization
 * Requires OWNER role
 * Updates Stripe subscription with new quantity
 * 
 * @param email - User's email
 * @param name - User's name
 * @param role - User's role (default: MEMBER)
 * @returns Action response
 */
export async function addUserToOrganization(
  email: string,
  name: string,
  role: UserRole = "MEMBER"
): Promise<ActionResponse<{ userId: string }>> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user is OWNER
    if (dbUser.role !== "OWNER") {
      return { success: false, error: "Only owners can add users" };
    }

    // Check if email already exists in organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId: dbUser.organizationId,
      },
    });

    if (existingUser) {
      return { success: false, error: "User already exists in organization" };
    }

    // Get current user count
    const currentUserCount = await prisma.user.count({
      where: { organizationId: dbUser.organizationId },
    });

    // Check subscription limits
    if (
      dbUser.organization.maxMembers &&
      currentUserCount >= dbUser.organization.maxMembers
    ) {
      return {
        success: false,
        error: "User limit reached. Please upgrade your subscription.",
      };
    }

    // Create user in database
    // Note: User ID should come from Supabase Auth, this is a placeholder
    // In real implementation, you'd create the user in Supabase Auth first
    const newUser = await prisma.user.create({
      data: {
        id: `temp-${Date.now()}`, // Replace with Supabase Auth ID
        email,
        name,
        role,
        organizationId: dbUser.organizationId,
      },
    });

    // Update Stripe subscription quantity
    if (dbUser.organization.subscription) {
      const newQuantity = currentUserCount + 1;
      
      // Get current subscription from Stripe
      const currentSubscription = await stripe.subscriptions.retrieve(
        dbUser.organization.subscription.stripeSubscriptionId
      );

      // Get new subscription items with updated quantity
      const newSubscriptionItems = getStripeSubscriptionItems(newQuantity);

      // Build the items array for Stripe API
      const stripeItems = newSubscriptionItems.map((newItem) => {
        // Find existing item with matching price
        const existingItem = currentSubscription.items.data.find(
          (item) => item.price.id === newItem.price
        );

        return {
          id: existingItem?.id, // Include ID if item exists, undefined if new
          price: newItem.price,
          quantity: newItem.quantity,
        };
      });

      // Remove any items not in the new configuration
      const itemsToDelete = currentSubscription.items.data
        .filter(
          (existingItem) =>
            !newSubscriptionItems.some(
              (newItem) => newItem.price === existingItem.price.id
            )
        )
        .map((item) => ({ id: item.id, deleted: true as const }));

      // Update subscription
      await stripe.subscriptions.update(
        dbUser.organization.subscription.stripeSubscriptionId,
        {
          items: [...stripeItems, ...itemsToDelete],
          metadata: {
            totalSeats: newQuantity.toString(),
          },
          proration_behavior: "always_invoice",
        }
      );

      // Update subscription in database
      await prisma.subscription.update({
        where: { id: dbUser.organization.subscription.id },
        data: {
          quantity: newQuantity,
        },
      });
    }

    revalidatePath("/dashboard/users");
    return { success: true, data: { userId: newUser.id } };
  } catch (error) {
    console.error("Error adding user:", error);
    return {
      success: false,
      error: "Failed to add user. Please try again.",
    };
  }
}

/**
 * Removes a user from the organization
 * Requires OWNER role
 * Updates Stripe subscription with new quantity
 * 
 * @param userId - User ID to remove
 * @returns Action response
 */
export async function removeUserFromOrganization(
  userId: string
): Promise<ActionResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user is OWNER
    if (dbUser.role !== "OWNER") {
      return { success: false, error: "Only owners can remove users" };
    }

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return { success: false, error: "Cannot remove yourself" };
    }

    // Get user to remove
    const userToRemove = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToRemove) {
      return { success: false, error: "User not found" };
    }

    // Check if user belongs to the same organization
    if (userToRemove.organizationId !== dbUser.organizationId) {
      return { success: false, error: "User not in your organization" };
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    // Update Stripe subscription quantity
    if (dbUser.organization.subscription) {
      const newQuantity = await prisma.user.count({
        where: { organizationId: dbUser.organizationId },
      });

      // Get current subscription from Stripe
      const currentSubscription = await stripe.subscriptions.retrieve(
        dbUser.organization.subscription.stripeSubscriptionId
      );

      // Get new subscription items with updated quantity
      const newSubscriptionItems = getStripeSubscriptionItems(newQuantity);

      // Build the items array for Stripe API
      const stripeItems = newSubscriptionItems.map((newItem) => {
        // Find existing item with matching price
        const existingItem = currentSubscription.items.data.find(
          (item) => item.price.id === newItem.price
        );

        return {
          id: existingItem?.id, // Include ID if item exists, undefined if new
          price: newItem.price,
          quantity: newItem.quantity,
        };
      });

      // Remove any items not in the new configuration
      const itemsToDelete = currentSubscription.items.data
        .filter(
          (existingItem) =>
            !newSubscriptionItems.some(
              (newItem) => newItem.price === existingItem.price.id
            )
        )
        .map((item) => ({ id: item.id, deleted: true as const }));

      // Update subscription
      await stripe.subscriptions.update(
        dbUser.organization.subscription.stripeSubscriptionId,
        {
          items: [...stripeItems, ...itemsToDelete],
          metadata: {
            totalSeats: newQuantity.toString(),
          },
          proration_behavior: "always_invoice",
        }
      );

      // Update subscription in database
      await prisma.subscription.update({
        where: { id: dbUser.organization.subscription.id },
        data: {
          quantity: newQuantity,
        },
      });
    }

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Error removing user:", error);
    return {
      success: false,
      error: "Failed to remove user. Please try again.",
    };
  }
}

/**
 * Updates a user's role
 * Requires OWNER or ADMIN role
 * 
 * @param userId - User ID to update
 * @param newRole - New role
 * @returns Action response
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<ActionResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check permissions
    if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Prevent self-role change
    if (userId === currentUser.id) {
      return { success: false, error: "Cannot change your own role" };
    }

    // Get user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToUpdate) {
      return { success: false, error: "User not found" };
    }

    // Check if user belongs to the same organization
    if (userToUpdate.organizationId !== dbUser.organizationId) {
      return { success: false, error: "User not in your organization" };
    }

    // Update user role
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: "Failed to update user role. Please try again.",
    };
  }
}

/**
 * Gets all users in the current user's organization
 * 
 * @returns Action response with users array
 */
export async function getOrganizationUsers(): Promise<
  ActionResponse<{ users: Array<{ id: string; email: string; name: string | null; role: UserRole }> }>
> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { organizationId: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Get all users in organization
    const users = await prisma.user.findMany({
      where: { organizationId: dbUser.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: { users } };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: "Failed to fetch users. Please try again.",
    };
  }
}
