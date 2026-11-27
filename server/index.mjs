import { createApp } from './app.mjs';
import { configFrom } from './config.mjs';

const config = configFrom();
const app = await createApp(config);
app.listen(config.port, config.bindHost, () => {
  console.log(`DEBORRA server: ${config.origin}/`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => app.close());
}
