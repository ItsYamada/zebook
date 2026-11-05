import app from './app.js';
import { config } from './config.js';
import { migrate } from './migrate.js';

try {
  if (process.env.AUTO_MIGRATE === 'true') await migrate();
} catch (err) {
  console.error('Database setup failed:', err.message);
}

app.listen(config.port, () => console.log(`ZeBook running on port ${config.port}`));
