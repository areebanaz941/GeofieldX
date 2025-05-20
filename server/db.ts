import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Database connection
const connectionString = process.env.DATABASE_URL as string;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Initialize database schema without full migrations
async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create tables directly without using migrations folder
    const sqlSchema = `
      -- Create user role enum if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('Supervisor', 'Field');
        END IF;
      END $$;

      -- Create team status enum if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_status') THEN
          CREATE TYPE team_status AS ENUM ('Pending', 'Approved', 'Rejected');
        END IF;
      END $$;

      -- Create task status enum if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
          CREATE TYPE task_status AS ENUM ('Unassigned', 'Assigned', 'In Progress', 'Completed', 'In-Complete', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress');
        END IF;
      END $$;

      -- Create feature type enum if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_type') THEN
          CREATE TYPE feature_type AS ENUM ('Tower', 'Manhole', 'FiberCable', 'Parcel');
        END IF;
      END $$;

      -- Create task priority enum if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
          CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
        END IF;
      END $$;

      -- Create teams table if not exists
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status team_status NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        approved_by INTEGER
      );

      -- Create users table if not exists
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role user_role NOT NULL,
        team_id INTEGER,
        last_active TIMESTAMP,
        current_location JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
      );

      -- Create tasks table if not exists
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status task_status NOT NULL DEFAULT 'Unassigned',
        priority task_priority NOT NULL,
        created_by INTEGER,
        assigned_to INTEGER,
        due_date TIMESTAMP,
        location JSONB,
        boundary_id INTEGER,
        feature_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add foreign key to teams for approved_by
      ALTER TABLE teams
      ADD CONSTRAINT fk_teams_approved_by
      FOREIGN KEY (approved_by) 
      REFERENCES users(id) 
      ON DELETE SET NULL;
    `;
    
    // Execute SQL to create tables
    await client.unsafe(sqlSchema);
    
    console.log('Database setup complete');
  } catch (error) {
    console.error('Database setup error:', error);
  }
}

export { db, setupDatabase };