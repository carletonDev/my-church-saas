import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDiscussion } from "@/actions/discussion.actions";
import { MessageList } from "@/components/discussion/message-list";
import { MessageForm } from "@/components/discussion/message-form";
import { DiscussionHeader } from "@/components/discussion/discussion-header";
import type { MessageWithAuthor } from "@/types";

interface DiscussionPageProps {
  params: Promise<{ id: string }>;
}

async function DiscussionPage({ params }: DiscussionPageProps) {
  const { id } = await params;

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

  // Get discussion with messages
  const result = await getDiscussion(id);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Discussion not found</h1>
          <p className="mt-2 text-gray-600">{result.error}</p>
          <Link
            href="/dashboard/discussions"
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            Back to discussions
          </Link>
        </div>
      </div>
    );
  }

  const { discussion } = result.data;
  const isAdmin = dbUser.role === "ADMIN" || dbUser.role === "OWNER";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                Church SaaS
              </Link>
              <span className="ml-4 text-gray-400">/</span>
              <Link href="/dashboard/discussions" className="ml-4 text-gray-600 hover:text-gray-900">
                Discussions
              </Link>
              <span className="ml-4 text-gray-400">/</span>
              <span className="ml-4 text-gray-900 font-medium truncate max-w-xs">
                {discussion.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {dbUser.name || dbUser.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Fixed height with flex layout */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        {/* Discussion Header */}
        <DiscussionHeader
          discussion={discussion}
          isAdmin={isAdmin}
        />

        {/* Messages Container - Takes remaining space and scrolls */}
        <div className="flex-1 bg-white shadow rounded-lg flex flex-col overflow-hidden min-h-0">
          {/* Messages List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <MessageList
              discussionId={discussion.id}
              initialMessages={discussion.messages as unknown as MessageWithAuthor[]}
              currentUserId={dbUser.id}
              isAdmin={isAdmin}
            />
          </div>

          {/* Message Form - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200">
            <MessageForm
              discussionId={discussion.id}
              isLocked={discussion.isLocked}
              currentUserName={dbUser.name || dbUser.email}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiscussionPage;
