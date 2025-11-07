import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDiscussions } from "@/actions/discussion.actions";
import { CreateDiscussionButton } from "@/components/discussion/create-discussion-button";

async function DiscussionsPage() {
  // Get authenticated user
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Get user data from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // Get discussions
  const result = await getDiscussions();

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error loading discussions</h1>
          <p className="mt-2 text-gray-600">{result.error}</p>
        </div>
      </div>
    );
  }

  const { discussions } = result.data;
  const canCreateDiscussions = dbUser.role === "ADMIN" || dbUser.role === "OWNER";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                Church SaaS
              </Link>
              <span className="ml-4 text-gray-400">/</span>
              <span className="ml-4 text-gray-600">Discussions</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {dbUser.name || dbUser.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discussions</h1>
              <p className="mt-2 text-sm text-gray-600">
                Join the conversation with your community
              </p>
            </div>
            {canCreateDiscussions && <CreateDiscussionButton />}
          </div>

          {/* Discussions List */}
          {discussions.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No discussions yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {canCreateDiscussions
                  ? "Get started by creating a new discussion."
                  : "Check back later for new discussions."}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {discussions.map((discussion) => {
                const messageCount = (discussion as unknown as { _count?: { messages: number } })._count?.messages || 0;
                const lastMessage = discussion.messages?.[0];

                return (
                  <Link
                    key={discussion.id}
                    href={`/dashboard/discussions/${discussion.id}`}
                    className="block hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="px-6 py-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {discussion.title}
                            </h3>
                            {discussion.isLocked && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Locked
                              </span>
                            )}
                            {!discussion.isActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Archived
                              </span>
                            )}
                          </div>
                          {discussion.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {discussion.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              {messageCount} {messageCount === 1 ? "message" : "messages"}
                            </span>
                            {lastMessage && (
                              <span>
                                Last activity:{" "}
                                {new Date(lastMessage.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DiscussionsPage;
