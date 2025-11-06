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

type MobileNavProps = {
  role: UserRole;
};

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  // Only show on mobile
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white lg:hidden">
      <div className="flex items-center justify-around">
        {filteredItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center space-y-1 py-3 text-xs font-medium transition",
                isActive
                  ? "text-blue-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-blue-700" : "text-gray-500")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
