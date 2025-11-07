"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { createMessage } from "@/actions/message.actions";

interface MessageFormProps {
  discussionId: string;
  isLocked: boolean;
  currentUserName: string;
}

const MAX_CHARS = 5000;

export function MessageForm({ discussionId, isLocked, currentUserName }: MessageFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  // Focus on mount
  useEffect(() => {
    if (!isLocked) {
      textareaRef.current?.focus();
    }
  }, [isLocked]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!content.trim() || isPending || isLocked) return;

    setError(null);
    const messageContent = content.trim();
    setContent(""); // Optimistic clear

    startTransition(async () => {
      const result = await createMessage(discussionId, messageContent);

      if (!result.success) {
        setError(result.error || "Failed to send message");
        setContent(messageContent); // Restore content on error
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLocked) {
    return (
      <div className="p-4 bg-gray-50 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">
            This discussion is locked. No new messages can be posted.
          </span>
        </div>
      </div>
    );
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > MAX_CHARS * 0.9;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar placeholder */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
            {currentUserName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Input area */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Ctrl+Enter to send)"
            disabled={isPending}
            rows={1}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "44px", maxHeight: "200px" }}
          />

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span
                className={`text-xs ${
                  isOverLimit
                    ? "text-red-600 font-medium"
                    : isNearLimit
                    ? "text-yellow-600"
                    : "text-gray-500"
                }`}
              >
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400">
                Press Ctrl+Enter to send
              </span>
            </div>

            <button
              type="submit"
              disabled={isPending || !content.trim() || isOverLimit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
