"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type SSEOptions = {
  url: string;
  onMessage: (data: unknown) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
};

export function useSSE({ url, onMessage, onError, enabled = true }: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        onMessage(event.data);
      }
    };

    eventSource.onerror = (error) => {
      setConnected(false);
      onError?.(error);

      if (eventSource.readyState === EventSource.CLOSED) {
        setTimeout(connect, 3000);
      }
    };
  }, [url, onMessage, onError, enabled]);

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      setConnected(false);
    };
  }, [connect]);

  const close = useCallback(() => {
    eventSourceRef.current?.close();
    setConnected(false);
  }, []);

  return { connected, close };
}
