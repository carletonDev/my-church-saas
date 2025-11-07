/**
 * Discussion Management Server Actions
 *
 * Handles creating, updating, and managing discussion threads.
 * ADMIN and OWNER can create/lock/unlock discussions.
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ActionResponse, DiscussionWithMessages } from "@/types";

/**
 * Creates a new discussion thread
 * Only ADMIN and OWNER can create discussions
 *
 * @param title - Discussion title
 * @param description - Optional description
 * @returns Action response with created discussion
 */
export async function createDiscussion(
  title: string,
  description?: string
): Promise<ActionResponse<{ discussion: DiscussionWithMessages }>> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, organizationId: true, role: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check permissions (ADMIN or OWNER only)
    if (dbUser.role !== "ADMIN" && dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only admins and owners can create discussions",
      };
    }

    // Validate input
    if (!title || title.trim().length === 0) {
      return { success: false, error: "Discussion title cannot be empty" };
    }

    if (title.length > 200) {
      return { success: false, error: "Title is too long (max 200 characters)" };
    }

    if (description && description.length > 1000) {
      return {
        success: false,
        error: "Description is too long (max 1000 characters)",
      };
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);

    // Check for duplicate slug in organization
    const existingDiscussion = await prisma.discussion.findFirst({
      where: {
        organizationId: dbUser.organizationId,
        slug,
      },
    });

    // If slug exists, append a timestamp
    const finalSlug = existingDiscussion
      ? `${slug}-${Date.now()}`
      : slug;

    // Create discussion
    const discussion = await prisma.discussion.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        organizationId: dbUser.organizationId,
      },
      include: {
        messages: true,
        organization: true,
      },
    });

    revalidatePath("/dashboard/discussions");
    return {
      success: true,
      data: { discussion: discussion as unknown as DiscussionWithMessages },
    };
  } catch (error) {
    console.error("Error creating discussion:", error);
    return {
      success: false,
      error: "Failed to create discussion. Please try again.",
    };
  }
}

/**
 * Gets all discussions for the user's organization
 *
 * @param includeInactive - Include inactive discussions (default: false)
 * @returns Action response with discussions
 */
export async function getDiscussions(
  includeInactive: boolean = false
): Promise<ActionResponse<{ discussions: DiscussionWithMessages[] }>> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { organizationId: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Build query
    const where: any = {
      organizationId: dbUser.organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    // Fetch discussions with message count and last message
    const discussions = await prisma.discussion.findMany({
      where,
      include: {
        organization: true,
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      success: true,
      data: { discussions: discussions as unknown as DiscussionWithMessages[] },
    };
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return {
      success: false,
      error: "Failed to fetch discussions. Please try again.",
    };
  }
}

/**
 * Gets a single discussion by ID
 *
 * @param discussionId - Discussion ID
 * @returns Action response with discussion
 */
export async function getDiscussion(
  discussionId: string
): Promise<ActionResponse<{ discussion: DiscussionWithMessages }>> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { organizationId: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Fetch discussion
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        organization: true,
        messages: {
          where: { isDeleted: false },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!discussion) {
      return { success: false, error: "Discussion not found" };
    }

    // Verify access
    if (discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    return {
      success: true,
      data: { discussion: discussion as unknown as DiscussionWithMessages },
    };
  } catch (error) {
    console.error("Error fetching discussion:", error);
    return {
      success: false,
      error: "Failed to fetch discussion. Please try again.",
    };
  }
}

/**
 * Locks or unlocks a discussion
 * Only ADMIN and OWNER can lock/unlock discussions
 *
 * @param discussionId - Discussion ID
 * @param isLocked - New locked status
 * @returns Action response
 */
export async function toggleDiscussionLock(
  discussionId: string,
  isLocked: boolean
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
      select: { organizationId: true, role: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check permissions (ADMIN or OWNER only)
    if (dbUser.role !== "ADMIN" && dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only admins and owners can lock discussions",
      };
    }

    // Get discussion
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { organizationId: true },
    });

    if (!discussion) {
      return { success: false, error: "Discussion not found" };
    }

    // Verify access
    if (discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    // Update discussion
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { isLocked },
    });

    revalidatePath("/dashboard/discussions");
    revalidatePath(`/dashboard/discussions/${discussionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error toggling discussion lock:", error);
    return {
      success: false,
      error: "Failed to update discussion. Please try again.",
    };
  }
}

/**
 * Archives or unarchives a discussion
 * Only ADMIN and OWNER can archive discussions
 *
 * @param discussionId - Discussion ID
 * @param isActive - New active status
 * @returns Action response
 */
export async function toggleDiscussionActive(
  discussionId: string,
  isActive: boolean
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
      select: { organizationId: true, role: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check permissions (ADMIN or OWNER only)
    if (dbUser.role !== "ADMIN" && dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only admins and owners can archive discussions",
      };
    }

    // Get discussion
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { organizationId: true },
    });

    if (!discussion) {
      return { success: false, error: "Discussion not found" };
    }

    // Verify access
    if (discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    // Update discussion
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { isActive },
    });

    revalidatePath("/dashboard/discussions");
    revalidatePath(`/dashboard/discussions/${discussionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error toggling discussion active status:", error);
    return {
      success: false,
      error: "Failed to update discussion. Please try again.",
    };
  }
}
