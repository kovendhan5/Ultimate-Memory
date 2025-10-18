import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');

    try {
      await client.query('BEGIN');

      // Migration 1: Create users table
      console.log('📦 Creating users table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          username VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);
      console.log('✅ Users table created\n');

      // Migration 2: Create conversations table
      console.log('📦 Creating conversations table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);
      console.log('✅ Conversations table created\n');

      // Migration 3: Try to install pgvector extension
      console.log('📦 Installing pgvector extension...');
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log('✅ pgvector extension installed\n');
      } catch (error: any) {
        console.warn('⚠️  pgvector extension not available. Vector search will work without it.');
        console.warn('   To enable pgvector, install it: https://github.com/pgvector/pgvector\n');
      }

      // Migration 4: Create memories table
      console.log('📦 Creating memories table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          role VARCHAR(50) NOT NULL,
          model VARCHAR(100),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          importance FLOAT DEFAULT 1.0,
          tags TEXT[] DEFAULT '{}',
          metadata JSONB DEFAULT '{}'::jsonb,
          embedding vector(1536)
        )
      `);
      console.log('✅ Memories table created\n');

      // Migration 5: Create indexes
      console.log('📦 Creating indexes...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_memories_conversation_id ON memories(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_memories_role ON memories(role);
        CREATE INDEX IF NOT EXISTS idx_memories_model ON memories(model);
        CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
        CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);
      console.log('✅ Indexes created\n');

      // Migration 6: Create vector index if pgvector is available
      console.log('📦 Creating vector index...');
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_embedding 
          ON memories USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
        console.log('✅ Vector index created\n');
      } catch (error: any) {
        console.warn('⚠️  Vector index not created (pgvector not available)\n');
      }

      // Migration 7: Create analytics table
      console.log('📦 Creating analytics table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          event_type VARCHAR(100) NOT NULL,
          event_data JSONB DEFAULT '{}'::jsonb,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp DESC);
      `);
      console.log('✅ Analytics table created\n');

      // Migration 8: Create API keys table
      console.log('📦 Creating API keys table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          key_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          last_used TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      `);
      console.log('✅ API keys table created\n');

      await client.query('COMMIT');
      console.log('🎉 All migrations completed successfully!\n');

      // Show table information
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log('📊 Database tables:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
