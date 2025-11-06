import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Users, MessageSquare, CreditCard, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  // Get authenticated user
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user data with organization and subscription
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      organization: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!userData) {
    redirect("/login");
  }

  // Fetch stats
  const [totalUsers, activeDiscussions, totalDiscussions, recentMessages] = await Promise.all([
    // Count total users in organization
    prisma.user.count({
      where: { organizationId: userData.organizationId },
    }),
    // Count active discussions
    prisma.discussion.count({
      where: {
        organizationId: userData.organizationId,
        isActive: true,
      },
    }),
    // Count total discussions
    prisma.discussion.count({
      where: { organizationId: userData.organizationId },
    }),
    // Get recent messages for activity feed
    prisma.message.findMany({
      where: {
        discussion: {
          organizationId: userData.organizationId,
        },
        isDeleted: false,
      },
      include: {
        author: true,
        discussion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  const subscription = userData.organization.subscription;

  // Determine subscription status info
  const getSubscriptionInfo = () => {
    if (!subscription) {
      return {
        label: "No Subscription",
        color: "bg-gray-100 text-gray-800",
        icon: AlertCircle,
        message: "No active subscription",
      };
    }

    switch (subscription.status) {
      case "ACTIVE":
        return {
          label: "Active",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          message: `Renews ${formatDate(subscription.stripeCurrentPeriodEnd)}`,
        };
      case "TRIALING":
        return {
          label: "Trial",
          color: "bg-blue-100 text-blue-800",
          icon: TrendingUp,
          message: `Trial ends ${formatDate(subscription.trialEnd!)}`,
        };
      case "PAST_DUE":
        return {
          label: "Past Due",
          color: "bg-yellow-100 text-yellow-800",
          icon: AlertCircle,
          message: "Payment required",
        };
      case "CANCELED":
        return {
          label: "Canceled",
          color: "bg-red-100 text-red-800",
          icon: AlertCircle,
          message: `Ends ${formatDate(subscription.stripeCurrentPeriodEnd)}`,
        };
      default:
        return {
          label: "Incomplete",
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
          message: "Setup incomplete",
        };
    }
  };

  const subscriptionInfo = getSubscriptionInfo();
  const StatusIcon = subscriptionInfo.icon;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userData.name || "there"}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here&apos;s what&apos;s happening with {userData.organization.name} today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Users Card */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/users"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Manage users →
              </Link>
            </div>
          </div>
        </div>

        {/* Active Discussions Card */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Discussions</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{activeDiscussions}</p>
                <p className="mt-1 text-xs text-gray-500">of {totalDiscussions} total</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/discussions"
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                View discussions →
              </Link>
            </div>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Subscription</p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${subscriptionInfo.color}`}>
                    {subscriptionInfo.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{subscriptionInfo.message}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <StatusIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            {userData.role === "OWNER" && (
              <div className="mt-4">
                <Link
                  href="/dashboard/billing"
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  Manage billing →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action based on subscription status */}
      {(!subscription || subscription.status !== "ACTIVE") && userData.role === "OWNER" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900">
                {subscription ? "Update Your Subscription" : "Get Started with a Subscription"}
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                {subscription
                  ? "Your subscription needs attention. Update your payment method to continue using all features."
                  : "Subscribe to unlock all features and start building your church community."}
              </p>
              <Link
                href="/dashboard/billing"
                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                {subscription ? "Update Subscription" : "View Plans"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="mt-1 text-sm text-gray-500">Latest messages from your discussions</p>
        </div>
        <div className="divide-y divide-gray-200">
          {recentMessages.length > 0 ? (
            recentMessages.map((message) => (
              <div key={message.id} className="px-6 py-4 transition hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-medium">
                    {message.author.name?.charAt(0).toUpperCase() || message.author.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {message.author.name || message.author.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      in{" "}
                      <Link
                        href={`/dashboard/discussions/${message.discussion.slug}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {message.discussion.title}
                      </Link>
                    </p>
                    <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first discussion.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/discussions"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Create Discussion
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
