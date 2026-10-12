import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { API_URL } from '../config/app';
import { useAuthStore } from '../store/authStore';

export function useQueueSocket(branchId: string | null | undefined) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!branchId) return;

    let isSubscribed = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!isSubscribed) return;

      const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
      const host = API_URL.replace(/^https?:\/\//, '');
      const url = `${wsProtocol}://${host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) {
            ws.close();
            return;
          }
          ws.send(JSON.stringify({ type: 'SUBSCRIBE', branchId }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.branchId === branchId) {
              if (data.type === 'SHIFT_UPDATED') {
                queryClient.invalidateQueries({ queryKey: ['barber-shift', branchId] });
              } else if (data.type === 'QUEUE_UPDATED') {
                queryClient.invalidateQueries({ queryKey: ['barber-queue', branchId] });
                queryClient.invalidateQueries({ queryKey: ['barber-shift', branchId] });
              }
            }
          } catch {
            // Ignore non-json frames
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (isSubscribed) {
            retryTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isSubscribed) {
          retryTimer = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (wsRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'UNSUBSCRIBE', branchId }));
          wsRef.current.close();
        } catch {
          // Ignore
        }
        wsRef.current = null;
      }
    };
  }, [branchId, token, queryClient]);
}
