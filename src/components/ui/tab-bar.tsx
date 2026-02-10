"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Zap,
  ClipboardList,
  Heart,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  isPlayCard?: boolean;
};

const CARD_HOLDER_TABS: TabItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: <Home className="w-6 h-6" strokeWidth={1.5} />,
    activeIcon: <Home className="w-6 h-6" strokeWidth={2.5} />,
  },
  {
    href: "/self-care",
    label: "Self-Care",
    icon: <Heart className="w-6 h-6" strokeWidth={1.5} />,
    activeIcon: <Heart className="w-6 h-6" strokeWidth={2.5} />,
  },
  {
    href: "/play-card",
    label: "Play Card",
    icon: <Zap className="w-7 h-7" strokeWidth={1.5} />,
    activeIcon: <Zap className="w-7 h-7" strokeWidth={2.5} />,
    isPlayCard: true,
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: <ClipboardList className="w-6 h-6" strokeWidth={1.5} />,
    activeIcon: <ClipboardList className="w-6 h-6" strokeWidth={2.5} />,
  },
  {
    href: "/leaderboard",
    label: "Crew",
    icon: <Trophy className="w-6 h-6" strokeWidth={1.5} />,
    activeIcon: <Trophy className="w-6 h-6" strokeWidth={2.5} />,
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-royal-100 safe-bottom">
      <div className="flex items-end justify-around px-2 pt-1 pb-1 max-w-lg mx-auto">
        {CARD_HOLDER_TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);

          if (tab.isPlayCard) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-4 min-h-0 min-w-0"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-royal to-blush text-white shadow-raised",
                    "transition-transform duration-150 active:scale-90",
                    isActive && "animate-pulse-glow"
                  )}
                >
                  {isActive ? tab.activeIcon : tab.icon}
                </div>
                <span className="text-[10px] font-heading font-bold text-royal mt-0.5">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 min-h-[44px] min-w-[44px]",
                "transition-colors duration-150",
                isActive ? "text-royal" : "text-muted"
              )}
            >
              {isActive ? tab.activeIcon : tab.icon}
              <span
                className={cn(
                  "text-[10px] mt-0.5 font-heading",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
