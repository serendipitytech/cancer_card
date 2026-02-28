"use client";

import { useState, useCallback, useEffect } from "react";
import { useSSE } from "@/hooks/use-sse";

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

type UseNotificationsOptions = {
  enabled?: boolean;
};

export function useNotifications({ enabled = true }: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const onMessage = useCallback((data: unknown) => {
    const msg = data as Record<string, unknown>;

    if (msg.type === "connected") {
      setUnreadCount((msg.unreadCount as number) || 0);
      return;
    }

    if (msg.type === "notification") {
      const entry = msg.entry as NotificationEntry;
      setNotifications((prev) => [entry, ...prev]);
      setUnreadCount((prev) => prev + 1);
      return;
    }
    // heartbeat — no-op
  }, []);

  const { connected } = useSSE({
    url: "/api/notifications/stream",
    onMessage,
    enabled,
  });

  // Load initial notifications
  useEffect(() => {
    if (!enabled) return;

    fetch("/api/notifications?limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
        }
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {
        // Silently fail - notifications are non-critical
      });
  }, [enabled]);

  const markAsRead = useCallback(async (ids: string[]) => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            ids.includes(n.id) ? { ...n, status: "read", readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - data.markedCount));
      }
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: "read", readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
  };
}
