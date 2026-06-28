/**
 * Standalone migration runner.
 * Run with:  npm run db:migrate
 */
import 'dotenv/config';
import { runMigration } from './client';

runMigration()
  .then(() => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
