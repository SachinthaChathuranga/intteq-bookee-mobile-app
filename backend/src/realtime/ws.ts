import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { config } from '../config/index.js';

interface ClientMeta {
  userId?: string;
  branchIds: Set<string>;
  isAlive: boolean;
}

const clientMap = new Map<WebSocket, ClientMeta>();

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const meta: ClientMeta = {
      branchIds: new Set<string>(),
      isAlive: true,
    };

    // Authenticate optionally via query param: /ws?token=...
    try {
      const url = new URL(req.url ?? '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (token) {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as { sub?: string };
        meta.userId = decoded.sub;
      }
    } catch {
      // Unauthenticated socket or invalid token; still allowed for public queue view if needed
    }

    clientMap.set(ws, meta);

    ws.on('pong', () => {
      meta.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'SUBSCRIBE' && typeof msg.branchId === 'string') {
          meta.branchIds.add(msg.branchId);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', branchId: msg.branchId }));
        } else if (msg.type === 'UNSUBSCRIBE' && typeof msg.branchId === 'string') {
          meta.branchIds.delete(msg.branchId);
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clientMap.delete(ws);
    });

    ws.on('error', () => {
      clientMap.delete(ws);
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    if (!wss) return;
    for (const [ws, meta] of clientMap.entries()) {
      if (!meta.isAlive) {
        clientMap.delete(ws);
        ws.terminate();
        continue;
      }
      meta.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

export function broadcastBranchEvent(branchId: string, event: Record<string, unknown>) {
  if (!wss) return;
  const payload = JSON.stringify({ ...event, branchId });
  for (const [ws, meta] of clientMap.entries()) {
    if (ws.readyState === WebSocket.OPEN && meta.branchIds.has(branchId)) {
      ws.send(payload);
    }
  }
}
