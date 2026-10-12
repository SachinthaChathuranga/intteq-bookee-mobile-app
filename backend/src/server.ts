import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { initWebSocketServer } from './realtime/ws.js';

const app = createApp();
const server = http.createServer(app);

initWebSocketServer(server);

server.listen(config.PORT, () => {
  console.log(`${config.APP_NAME} API + WebSocket listening on :${config.PORT}`);
});
