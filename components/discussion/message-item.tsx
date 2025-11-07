"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { editMessage, deleteMessage } from "@/actions/message.actions";
import type { MessageWithAuthor } from "@/types";

interface MessageItemProps {
  message: MessageWithAuthor;
  currentUserId: string;
  isAdmin: boolean;
}

export function MessageItem({ message, currentUserId, isAdmin }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwnMessage = message.authorId === currentUserId;
  const canDelete = isOwnMessage || isAdmin;

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await editMessage(message.id, editContent.trim());

      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error || "Failed to edit message");
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteMessage(message.id);

      if (!result.success) {
        setError(result.error || "Failed to delete message");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEdit();
    }
  };

  // Don't render deleted messages (they're filtered in the list, but just in case)
  if (message.isDeleted) {
    return null;
  }

  const authorName = message.author.name || message.author.email;
  const timestamp = new Date(message.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex gap-3 group ${isOwnMessage ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
            isOwnMessage ? "bg-blue-600" : "bg-gray-600"
          }`}
        >
          {authorName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-xl ${isOwnMessage ? "text-right" : ""}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
          <span className="text-sm font-medium text-gray-900">{authorName}</span>
          <span className="text-xs text-gray-500">{timestamp}</span>
          {message.isEdited && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={3}
            />
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={isPending || !editContent.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                  setError(null);
                }}
                disabled={isPending}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`inline-block px-4 py-2 rounded-lg ${
              isOwnMessage
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!isEditing && (showActions || error) && (
          <div className={`mt-2 flex gap-2 ${isOwnMessage ? "justify-end" : ""}`}>
            {isOwnMessage && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        )}

        {error && !isEditing && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
