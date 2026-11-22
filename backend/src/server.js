import app from './app.js';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { importBooks, importStatus } from './importBooks.js';

try {
  if (process.env.AUTO_MIGRATE === 'true') await migrate();
} catch (err) {
  console.error('Database setup failed:', err.message);
}

// The catalog is topped up to BOOK_TARGET books in the background (default 260; set BOOK_TARGET=0 to switch it off).
const raw = process.env.BOOK_TARGET;
const target = raw === undefined || raw === '' || Number.isNaN(Number(raw)) ? 260 : Number(raw);

app.listen(config.port, () => {
  console.log(`ZeBook running on port ${config.port}`);
  if (target > 0) {
    importBooks(target).catch((err) => console.error('Book import failed:', err.message));
  } else {
    importStatus.state = 'disabled';
    importStatus.note = 'BOOK_TARGET is 0, so the importer is switched off';
  }
});
