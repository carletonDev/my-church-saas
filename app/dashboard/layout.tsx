import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <DashboardNav
        user={userData}
        organization={userData.organization}
      />

      <div className="flex">
        {/* Desktop Sidebar */}
        <DashboardSidebar
          role={userData.role}
          className="hidden lg:block"
        />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav role={userData.role} />
    </div>
  );
}
