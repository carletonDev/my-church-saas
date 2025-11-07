"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleDiscussionLock } from "@/actions/discussion.actions";
import type { Discussion } from "@prisma/client";

interface DiscussionHeaderProps {
  discussion: Discussion;
  isAdmin: boolean;
}

export function DiscussionHeader({ discussion, isAdmin }: DiscussionHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggleLock = async () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleDiscussionLock(discussion.id, !discussion.isLocked);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to update discussion");
      }
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-4 flex-shrink-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {discussion.title}
            </h1>
            {discussion.isLocked && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <svg
                  className="mr-1 h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Locked
              </span>
            )}
            {!discussion.isActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Archived
              </span>
            )}
          </div>
          {discussion.description && (
            <p className="text-gray-600 text-sm">{discussion.description}</p>
          )}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleToggleLock}
              disabled={isPending}
              className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                discussion.isLocked
                  ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500"
                  : "border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500"
              }`}
            >
              {discussion.isLocked ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"
                    />
                  </svg>
                  Unlock
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Lock
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
