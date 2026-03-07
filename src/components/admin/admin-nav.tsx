"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: "/admin/crews",
    label: "Crews",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: <Activity className="w-5 h-5" />,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(href);
}

type AdminNavProps = {
  mobile?: boolean;
};

export function AdminNav({ mobile }: AdminNavProps) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm font-medium whitespace-nowrap transition-colors",
                "min-h-[44px] min-w-0",
                active
                  ? "bg-royal-50 text-royal"
                  : "text-muted hover:text-ink"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col h-full bg-surface border-r border-royal-100/50">
      <div className="p-6">
        <h2 className="font-heading font-bold text-lg text-midnight">
          Admin
        </h2>
        <p className="text-xs text-muted mt-0.5">Read-only dashboard</p>
      </div>

      <div className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors",
                "min-h-[44px]",
                active
                  ? "bg-royal-50 text-royal"
                  : "text-muted hover:text-ink"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-3 mt-auto border-t border-royal-100/50">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors",
            "min-h-[44px] text-muted hover:text-ink"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to App
        </Link>
      </div>
    </nav>
  );
}
