"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { NotificationItem } from "./notification-item";

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

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  notifications: NotificationEntry[];
  unreadCount: number;
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
};

export function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications">
      {unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={onMarkAllRead}
            className="text-sm font-semibold text-royal hover:text-royal-dark transition-colors min-h-[44px] px-3"
          >
            Mark all as read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-3xl mb-3">🔔</p>
          <p className="text-muted font-medium">No notifications yet</p>
          <p className="text-muted text-sm mt-1">
            We&apos;ll let you know when something happens
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={() => {
                if (notification.status !== "read") {
                  onMarkRead([notification.id]);
                }
              }}
            />
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
