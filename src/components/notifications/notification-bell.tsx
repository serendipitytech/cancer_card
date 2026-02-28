"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative p-2 rounded-full min-h-[44px] min-w-[44px]",
          "flex items-center justify-center",
          "text-midnight hover:bg-royal-50 transition-colors"
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5",
              "flex items-center justify-center",
              "min-w-[20px] h-5 px-1 rounded-full",
              "bg-blush text-white text-[11px] font-bold font-mono",
              "animate-in fade-in zoom-in duration-200"
            )}
          >
            {displayCount}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
      />
    </>
  );
}
