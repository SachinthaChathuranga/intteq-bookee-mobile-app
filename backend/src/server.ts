import { createApp } from './app.js';
import { config } from './config/index.js';

createApp().listen(config.PORT, () => {
  console.log(`${config.APP_NAME} API listening on :${config.PORT}`);
});
