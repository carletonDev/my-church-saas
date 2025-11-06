"use client";

import { useState } from "react";
import { User, Organization, Subscription } from "@prisma/client";
import { LogOut, Settings, User as UserIcon, CreditCard, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DashboardNavProps = {
  user: User;
  organization: Organization & {
    subscription: Subscription | null;
  };
};

export function DashboardNav({ user, organization }: DashboardNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Organization Name */}
        <div className="flex items-center space-x-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-lg">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {organization.name}
            </h1>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-medium">
              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="p-2">
                  {/* User Info */}
                  <div className="border-b border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/dashboard/settings");
                    }}
                    className="mt-2 flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push("/dashboard/profile");
                    }}
                    className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Profile</span>
                  </button>

                  {user.role === "OWNER" && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push("/dashboard/billing");
                      }}
                      className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Billing</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
