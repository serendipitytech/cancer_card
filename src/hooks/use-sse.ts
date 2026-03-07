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
  const retryCountRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const MAX_RETRIES = 5;

  const connect = useCallback(() => {
    if (!enabled) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      retryCountRef.current = 0;
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

      if (eventSource.readyState === EventSource.CLOSED && retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000) + Math.random() * 1000;
        retryCountRef.current += 1;
        setTimeout(connect, delay);
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
