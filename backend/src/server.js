import app from './app.js';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { importBooks } from './importBooks.js';

try {
  if (process.env.AUTO_MIGRATE === 'true') await migrate();
} catch (err) {
  console.error('Database setup failed:', err.message);
}

app.listen(config.port, () => {
  console.log(`ZeBook running on port ${config.port}`);
  // Optional: top the catalog up to BOOK_TARGET books in the background (see importBooks.js)
  const target = Number(process.env.BOOK_TARGET || 0);
  if (target > 0) importBooks(target).catch((err) => console.error('Book import failed:', err.message));
});
