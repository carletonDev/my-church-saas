/**
 * Message Management Server Actions
 * 
 * Handles creating, editing, and deleting messages in discussions.
 * Messages are created via Server Actions and then broadcast to
 * clients via Supabase Realtime subscriptions.
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ActionResponse, MessageWithAuthor } from "@/types";

/**
 * Creates a new message in a discussion
 * All authenticated users can create messages
 * 
 * @param discussionId - Discussion ID
 * @param content - Message content
 * @param parentMessageId - Optional parent message ID for threading
 * @returns Action response with created message
 */
export async function createMessage(
  discussionId: string,
  content: string,
  parentMessageId?: string
): Promise<ActionResponse<{ message: MessageWithAuthor }>> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, organizationId: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Get discussion and verify access
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: {
        id: true,
        organizationId: true,
        isActive: true,
        isLocked: true,
      },
    });

    if (!discussion) {
      return { success: false, error: "Discussion not found" };
    }

    // Check if user has access to this discussion
    if (discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    // Check if discussion is active and not locked
    if (!discussion.isActive) {
      return { success: false, error: "Discussion is no longer active" };
    }

    if (discussion.isLocked) {
      return { success: false, error: "Discussion is locked" };
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Message content cannot be empty" };
    }

    if (content.length > 5000) {
      return { success: false, error: "Message is too long (max 5000 characters)" };
    }

    // If parent message provided, verify it exists and belongs to this discussion
    if (parentMessageId) {
      const parentMessage = await prisma.message.findUnique({
        where: { id: parentMessageId },
        select: { discussionId: true },
      });

      if (!parentMessage || parentMessage.discussionId !== discussionId) {
        return { success: false, error: "Invalid parent message" };
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        discussionId,
        authorId: dbUser.id,
        parentMessageId: parentMessageId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        discussion: {
          select: {
            id: true,
            title: true,
            organizationId: true,
          },
        },
      },
    });

    revalidatePath(`/dashboard/discussions/${discussionId}`);
    
    return { 
      success: true, 
      data: { message: message as unknown as MessageWithAuthor } 
    };
  } catch (error) {
    console.error("Error creating message:", error);
    return {
      success: false,
      error: "Failed to create message. Please try again.",
    };
  }
}

/**
 * Edits an existing message
 * Users can only edit their own messages
 * 
 * @param messageId - Message ID
 * @param content - New content
 * @returns Action response
 */
export async function editMessage(
  messageId: string,
  content: string
): Promise<ActionResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        discussion: {
          select: { organizationId: true },
        },
      },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, organizationId: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check ownership
    if (message.authorId !== dbUser.id) {
      return { success: false, error: "You can only edit your own messages" };
    }

    // Check organization access
    if (message.discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Message content cannot be empty" };
    }

    if (content.length > 5000) {
      return { success: false, error: "Message is too long (max 5000 characters)" };
    }

    // Update message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
      },
    });

    revalidatePath(`/dashboard/discussions/${message.discussionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error editing message:", error);
    return {
      success: false,
      error: "Failed to edit message. Please try again.",
    };
  }
}

/**
 * Soft-deletes a message
 * Users can delete their own messages
 * ADMIN and OWNER can delete any message
 * 
 * @param messageId - Message ID
 * @returns Action response
 */
export async function deleteMessage(
  messageId: string
): Promise<ActionResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        discussion: {
          select: { organizationId: true },
        },
      },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, organizationId: true, role: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check organization access
    if (message.discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    // Check permissions
    const isOwner = message.authorId === dbUser.id;
    const isAdminOrOwner = dbUser.role === "ADMIN" || dbUser.role === "OWNER";

    if (!isOwner && !isAdminOrOwner) {
      return {
        success: false,
        error: "You don't have permission to delete this message",
      };
    }

    // Soft delete message
    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    revalidatePath(`/dashboard/discussions/${message.discussionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return {
      success: false,
      error: "Failed to delete message. Please try again.",
    };
  }
}

/**
 * Gets messages for a discussion
 * Excludes soft-deleted messages
 * 
 * @param discussionId - Discussion ID
 * @param limit - Number of messages to fetch (default: 50)
 * @param cursor - Cursor for pagination (message ID)
 * @returns Action response with messages
 */
export async function getDiscussionMessages(
  discussionId: string,
  limit: number = 50,
  cursor?: string
): Promise<ActionResponse<{ messages: MessageWithAuthor[]; hasMore: boolean }>> {
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

    // Verify discussion access
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { organizationId: true },
    });

    if (!discussion) {
      return { success: false, error: "Discussion not found" };
    }

    if (discussion.organizationId !== dbUser.organizationId) {
      return { success: false, error: "Access denied" };
    }

    // Build query
    const where: any = {
      discussionId,
      isDeleted: false,
    };

    if (cursor) {
      where.id = { lt: cursor };
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        discussion: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to check if there are more
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      success: true,
      data: {
        messages: resultMessages as unknown as MessageWithAuthor[],
        hasMore,
      },
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return {
      success: false,
      error: "Failed to fetch messages. Please try again.",
    };
  }
}
