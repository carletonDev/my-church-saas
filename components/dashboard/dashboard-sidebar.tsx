"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER", "ADMIN", "MEMBER"],
  },
  {
    label: "Discussions",
    href: "/dashboard/discussions",
    icon: MessageSquare,
    roles: ["OWNER", "ADMIN", "MEMBER"],
  },
  {
    label: "Users",
    href: "/dashboard/users",
    icon: Users,
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["OWNER", "ADMIN"],
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    roles: ["OWNER"],
  },
];

type DashboardSidebarProps = {
  role: UserRole;
  className?: string;
};

export function DashboardSidebar({ role, className }: DashboardSidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        "w-64 border-r border-gray-200 bg-white px-4 py-6",
        className
      )}
    >
      <nav className="space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-blue-700" : "text-gray-500")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
