import { createClient } from '@libsql/client';

if (!process.env.TURSO_DB_URL) {
  throw new Error('TURSO_DB_URL is not defined');
}

export const client = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
}); 