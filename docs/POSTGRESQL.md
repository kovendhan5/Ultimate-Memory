# PostgreSQL Setup Guide

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name ultimate-memory-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=ultimate_memory \
  -p 5432:5432 \
  postgres:15-alpine

# With pgvector extension (for better vector search)
docker run -d \
  --name ultimate-memory-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=ultimate_memory \
  -p 5432:5432 \
  ankane/pgvector
```

### Option 2: Local Installation

#### Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the wizard
3. Remember your password for the `postgres` user

#### Mac

```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Configuration

### 1. Update Environment Variables

Edit `backend/.env`:

```env
# Change from memory to postgresql
DATABASE_TYPE=postgresql

# Set your connection string
DATABASE_URL=postgresql://username:password@localhost:5432/ultimate_memory

# Example connections:
# Local: postgresql://postgres:password@localhost:5432/ultimate_memory
# Docker: postgresql://postgres:yourpassword@localhost:5432/ultimate_memory
# Heroku: Use the DATABASE_URL they provide
# Railway: Use the DATABASE_URL they provide
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ultimate_memory;

# Exit
\q
```

### 3. Run Migrations

```bash
cd backend
npm run migrate
```

You should see:

```
🚀 Starting database migrations...
✅ Database connection successful
📦 Creating users table...
✅ Users table created
📦 Creating conversations table...
✅ Conversations table created
📦 Installing pgvector extension...
✅ pgvector extension installed
📦 Creating memories table...
✅ Memories table created
📦 Creating indexes...
✅ Indexes created
📦 Creating vector index...
✅ Vector index created
🎉 All migrations completed successfully!
```

### 4. Start the Server

```bash
npm run dev
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Conversations Table

```sql
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Memories Table

```sql
CREATE TABLE memories (
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
  embedding vector(1536)  -- Requires pgvector extension
);
```

### Analytics Events Table

```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Vector Search with pgvector

### Installing pgvector

#### Docker

Use the `ankane/pgvector` image (already includes pgvector)

#### Mac

```bash
brew install pgvector
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# From source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

#### Windows

Download from: https://github.com/pgvector/pgvector/releases

### Enable in Database

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Benefits

- **10-100x faster** vector similarity search
- **Scalable** to millions of embeddings
- **Index support** with IVFFlat and HNSW
- **Native SQL queries**

### Without pgvector

The system still works! It falls back to application-level cosine similarity calculation. It's just slower for large datasets.

## Connection String Formats

### Local Development

```
postgresql://postgres:password@localhost:5432/ultimate_memory
```

### Docker

```
postgresql://postgres:password@localhost:5432/ultimate_memory
```

### Cloud Providers

#### Heroku Postgres

```
postgresql://user:pass@host:5432/database?ssl=true
```

#### Railway

```
postgresql://postgres:pass@host.railway.app:5432/railway
```

#### Supabase

```
postgresql://postgres:pass@db.project.supabase.co:5432/postgres
```

#### AWS RDS

```
postgresql://username:password@instance.region.rds.amazonaws.com:5432/dbname
```

#### DigitalOcean

```
postgresql://user:pass@db.region.do-cluster.com:25060/defaultdb?sslmode=require
```

## Backup & Restore

### Backup

```bash
# Backup entire database
pg_dump -U postgres ultimate_memory > backup.sql

# Backup with compression
pg_dump -U postgres ultimate_memory | gzip > backup.sql.gz

# Docker
docker exec ultimate-memory-postgres pg_dump -U postgres ultimate_memory > backup.sql
```

### Restore

```bash
# Restore from backup
psql -U postgres ultimate_memory < backup.sql

# Restore compressed backup
gunzip -c backup.sql.gz | psql -U postgres ultimate_memory

# Docker
docker exec -i ultimate-memory-postgres psql -U postgres ultimate_memory < backup.sql
```

## Performance Tuning

### Connection Pooling

Already configured in `PostgresDatabaseService.ts`:

```typescript
{
  max: 20,                      // Max connections
  idleTimeoutMillis: 30000,     // Close idle connections
  connectionTimeoutMillis: 2000 // Connection timeout
}
```

### Indexes

All important indexes are created automatically:

- User ID, Conversation ID
- Timestamp, Role, Model
- Importance, Tags
- Vector embeddings (if pgvector available)

### Query Optimization

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Analyze tables
ANALYZE memories;
ANALYZE conversations;
ANALYZE users;

-- Vacuum to reclaim storage
VACUUM ANALYZE;
```

## Monitoring

### Check Connection

```bash
# Connect to database
psql -U postgres -d ultimate_memory

# List tables
\dt

# Check table sizes
\dt+

# View indexes
\di

# Check connections
SELECT * FROM pg_stat_activity;
```

### Useful Queries

```sql
-- Count memories
SELECT COUNT(*) FROM memories;

-- Check database size
SELECT pg_size_pretty(pg_database_size('ultimate_memory'));

-- Top users by memory count
SELECT user_id, COUNT(*) as memory_count
FROM memories
GROUP BY user_id
ORDER BY memory_count DESC
LIMIT 10;

-- Recent conversations
SELECT * FROM conversations
ORDER BY updated_at DESC
LIMIT 10;
```

## Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is running
# Mac
brew services list

# Linux
sudo systemctl status postgresql

# Check if port is open
netstat -an | grep 5432
```

### Authentication Failed

```bash
# Reset password
psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
```

### Extension Not Available

If you can't install pgvector:

1. The system will still work (fallback to app-level similarity)
2. Performance will be slower for large datasets
3. Consider using a managed database with pgvector support

### Migration Fails

```bash
# Drop and recreate database
psql -U postgres
DROP DATABASE ultimate_memory;
CREATE DATABASE ultimate_memory;
\q

# Run migrations again
npm run migrate
```

## Switching from In-Memory

### Data is NOT automatically migrated!

When you switch from `DATABASE_TYPE=memory` to `DATABASE_TYPE=postgresql`, you start fresh. To migrate data:

1. **Option A**: Export/Import via API (if you have data to keep)

```bash
# Export memories (requires custom script)
# Import to PostgreSQL after switching
```

2. **Option B**: Start fresh (recommended for development)

```bash
# Just switch DATABASE_TYPE and restart
# Old in-memory data is lost
```

3. **Option C**: Keep both (use different user IDs)

```bash
# Test PostgreSQL with new conversations
# Old data still in memory until restart
```

## Production Checklist

- [ ] Use a strong DATABASE_URL password
- [ ] Enable SSL connections (`?sslmode=require`)
- [ ] Set up automatic backups
- [ ] Configure connection pooling (done by default)
- [ ] Enable pgvector for better performance
- [ ] Monitor database size and growth
- [ ] Set up replication for high availability
- [ ] Configure VACUUM and ANALYZE schedules
- [ ] Enable query logging for debugging
- [ ] Use environment variables for credentials
- [ ] Never commit DATABASE_URL to git

## Cost Estimates

### Self-Hosted (Docker/VPS)

- **Free** (uses your server resources)
- Typical: 1-2 GB RAM, 10-20 GB storage

### Cloud Managed Databases

#### Heroku Postgres

- Mini: $5/mo (1GB RAM, 10k rows)
- Basic: $9/mo (10GB storage)
- Standard: $50/mo (64GB storage)

#### Supabase

- Free: 500MB database, 50k vector embeddings
- Pro: $25/mo, 8GB database

#### Railway

- Developer: $5/mo credit (scales with usage)
- Typical cost: $5-15/mo for small apps

#### DigitalOcean

- Basic: $15/mo (1GB RAM, 10GB storage)
- Professional: $60/mo (4GB RAM, 80GB storage)

### Recommendation

Start with **Docker (free)** or **Railway ($5/mo)** for development and small projects.

---

## Next Steps

1. ✅ Install PostgreSQL
2. ✅ Update `.env` file
3. ✅ Run migrations
4. ✅ Test the connection
5. 🚀 Start building!

For questions or issues, check the [main README](../README.md) or [DEVELOPMENT.md](./DEVELOPMENT.md).
