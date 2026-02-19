import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

const databaseUrl = process.env.DATABASE_URL || '';

// Check if we have a valid database URL
const isValidDatabaseUrl = databaseUrl && databaseUrl.startsWith('postgres');

if (!isValidDatabaseUrl && process.env.NODE_ENV !== 'production') {
  console.warn('DATABASE_URL is not set or invalid. Database operations will fail.');
}

// For query purposes - only create connection if URL is valid
const queryClient = isValidDatabaseUrl
  ? postgres(databaseUrl, {
      max: 10,           // max pool size
      idle_timeout: 20,  // close idle connections after 20s
      connect_timeout: 10, // connection timeout 10s
    })
  : null as any;
export const db = queryClient ? drizzle(queryClient, { schema: { ...schema, ...relations } }) : null as any;

// For migrations
export const migrationClient = isValidDatabaseUrl ? postgres(databaseUrl, { max: 1 }) : null as any;
