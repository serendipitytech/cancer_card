"use client";

import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { EVENT_EMOJIS } from "@/lib/event-emojis";

type NotificationEntry = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: string;
  createdAt: string | Date;
  readAt: string | Date | null;
};

type NotificationItemProps = {
  notification: NotificationEntry;
  onMarkRead: () => void;
};

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const isUnread = notification.status !== "read";
  const emoji = EVENT_EMOJIS[notification.eventType] || "📌";
  const createdAt =
    notification.createdAt instanceof Date
      ? notification.createdAt
      : new Date(notification.createdAt);

  return (
    <button
      onClick={onMarkRead}
      className={cn(
        "w-full text-left px-3 py-3 rounded-card transition-colors",
        "flex items-start gap-3 min-h-[44px]",
        isUnread
          ? "bg-royal-50 hover:bg-royal-100"
          : "hover:bg-cloud"
      )}
    >
      <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden>
        {emoji}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              isUnread ? "font-semibold text-midnight" : "font-medium text-ink"
            )}
          >
            {notification.title}
          </p>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-blush flex-shrink-0 mt-1.5" />
          )}
        </div>

        <p className="text-sm text-muted mt-0.5 line-clamp-2">
          {notification.body}
        </p>

        <p className="text-xs text-muted mt-1">
          {timeAgo(createdAt)}
        </p>
      </div>
    </button>
  );
}
