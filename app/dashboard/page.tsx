import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/actions/auth.actions";

async function handleSignOut() {
  "use server";
  await signOut();
}

async function DashboardPage() {
  // Get authenticated user
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Get user data from database with organization
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      organization: {
        include: {
          _count: {
            select: { users: true },
          },
        },
      },
    },
  });

  if (!dbUser) {
    // User not synced to database yet
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Setting up your account...</h1>
          <p className="mt-2 text-gray-600">Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Church SaaS
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {dbUser.name || dbUser.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {dbUser.name || dbUser.email}!
            </h2>
            <p className="text-gray-600">
              You&apos;re logged in to your Church SaaS dashboard.
            </p>
          </div>

          {/* Organization Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Organization Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dbUser.organization.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Slug</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dbUser.organization.slug}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Members</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dbUser.organization._count.users} / {dbUser.organization.maxMembers}
                  </dd>
                </div>
              </dl>
            </div>

            {/* User Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Your Profile
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{dbUser.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dbUser.name || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {dbUser.role}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Next Steps
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
              <li>Invite team members to your organization</li>
              <li>Create your first discussion thread</li>
              <li>Set up your subscription plan</li>
              <li>Customize your organization settings</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
