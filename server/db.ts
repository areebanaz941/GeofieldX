import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Database connection
const connectionString = process.env.DATABASE_URL as string;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Initialize database with migrations
async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create schema and tables
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Database setup complete');
  } catch (error) {
    console.error('Database setup error:', error);
  }
}

export { db, setupDatabase };