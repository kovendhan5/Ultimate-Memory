# 🚀 Quick Reference Card

## Instant Commands

### Start Development (In-Memory)

```bash
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### Enable PostgreSQL

```bash
# Start database
docker run -d --name postgres -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=ultimate_memory -p 5432:5432 ankane/pgvector

# Configure
echo "DATABASE_TYPE=postgresql" >> backend/.env
echo "DATABASE_URL=postgresql://postgres:pass@localhost:5432/ultimate_memory" >> backend/.env

# Migrate
cd backend && npm run migrate && cd ..

# Start
npm run dev
```

### Deploy with Docker

```bash
docker-compose up -d
```

---

## API Endpoints

### Chat (Standard)

```bash
POST /api/v1/ai/chat
{
  "message": "Hello!",
  "model": "openai",
  "userId": "user-123",
  "conversationId": "conv-abc"
}
```

### Chat (Streaming - SSE)

```bash
POST /api/v1/stream/chat
{
  "message": "Explain quantum computing",
  "model": "openai",
  "conversationId": "conv-123"
}
```

### Chat (Streaming - WebSocket)

```bash
POST /api/v1/stream/chat-websocket
{
  "message": "Tell me a story",
  "model": "anthropic",
  "conversationId": "conv-456"
}
```

### Store Memory

```bash
POST /api/v1/memory
{
  "userId": "user-123",
  "content": "My favorite color is blue",
  "role": "user",
  "conversationId": "conv-123"
}
```

### Search Memories

```bash
POST /api/v1/memory/search
{
  "query": "favorite color",
  "userId": "user-123",
  "limit": 10
}
```

---

## WebSocket Events

### Connect

```typescript
import { io } from "socket.io-client";
const socket = io("http://localhost:3000", {
  auth: { token: "your-jwt-token" },
});
```

### Subscribe to Chat

```typescript
socket.emit("subscribe:chat", { conversationId: "conv-123" });
```

### Listen for Chunks

```typescript
socket.on("chat:chunk", (data) => {
  console.log(data.chunk);
  if (data.done) console.log("Complete!");
});
```

### Typing Indicator

```typescript
socket.emit("typing:start", { conversationId: "conv-123" });
socket.emit("typing:stop", { conversationId: "conv-123" });
```

### Presence

```typescript
socket.emit("presence:online");
socket.on("user:online", (data) => console.log(`${data.username} online`));
socket.on("user:offline", (data) => console.log(`User ${data.userId} offline`));
```

---

## Configuration (.env)

### Required

```env
# AI Provider (at least one)
OPENAI_API_KEY=sk-...
```

### Database (choose one)

```env
# In-Memory (default)
DATABASE_TYPE=memory

# PostgreSQL
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Optional

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
REDIS_URL=redis://localhost:6379
```

---

## Database Commands

### Run Migrations

```bash
cd backend
npm run migrate
```

### Connect to DB

```bash
psql -U postgres -d ultimate_memory
```

### Check Tables

```sql
\dt          -- List tables
\d memories  -- Describe memories table
SELECT COUNT(*) FROM memories;
```

### Backup

```bash
pg_dump -U postgres ultimate_memory > backup.sql
```

### Restore

```bash
psql -U postgres ultimate_memory < backup.sql
```

---

## Docker Commands

### Start All Services

```bash
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop All

```bash
docker-compose down
```

### Rebuild

```bash
docker-compose build
docker-compose up -d
```

### Clean Everything

```bash
docker-compose down -v  # Includes volumes
```

---

## Troubleshooting

### Server Won't Start

```bash
# Check ports
netstat -an | grep 3000
netstat -an | grep 5432

# Check logs
cat backend/logs/error.log
```

### Database Connection Failed

```bash
# Test connection
psql -U postgres -h localhost -d ultimate_memory

# Check if running
docker ps | grep postgres

# Restart
docker restart postgres
```

### TypeScript Errors

```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install
```

### Clear Everything and Restart

```bash
# Backend
cd backend
rm -rf node_modules
npm install
npm run dev

# Frontend
cd frontend
rm -rf node_modules
npm install
npm run dev
```

---

## Useful Queries

### Recent Memories

```sql
SELECT * FROM memories
ORDER BY timestamp DESC
LIMIT 10;
```

### User Statistics

```sql
SELECT
  user_id,
  COUNT(*) as message_count,
  COUNT(DISTINCT conversation_id) as conversations
FROM memories
GROUP BY user_id;
```

### Top Models

```sql
SELECT
  model,
  COUNT(*) as usage_count
FROM memories
WHERE model IS NOT NULL
GROUP BY model
ORDER BY usage_count DESC;
```

### Vector Search Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM memories
WHERE user_id = 'user-123'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

---

## File Locations

### Configuration

- `backend/.env` - Environment variables
- `frontend/.env` - Frontend config
- `docker-compose.yml` - Docker services

### Logs

- `backend/logs/combined.log` - All logs
- `backend/logs/error.log` - Errors only

### Database

- Schema: `backend/src/storage/PostgresDatabaseService.ts`
- Migrations: `backend/src/scripts/migrate.ts`

### Documentation

- Quick Start: `README.md`
- Setup Guide: `docs/GETTING_STARTED.md`
- PostgreSQL: `docs/POSTGRESQL.md`
- WebSocket: `docs/WEBSOCKET.md`
- Updates: `docs/UPDATES.md`
- Status: `STATUS.md`

---

## Health Checks

### Backend

```bash
curl http://localhost:3000/health
```

### Database

```bash
docker exec postgres pg_isready -U postgres
```

### WebSocket

```javascript
// In browser console
const socket = io("http://localhost:3000");
socket.on("connect", () => console.log("Connected!"));
```

---

## Performance Tips

1. **Use PostgreSQL** for production (not in-memory)
2. **Enable pgvector** for fast similarity search
3. **Use Redis** for caching (optional)
4. **Set up indexes** (done automatically by migrations)
5. **Monitor connection pool** (default: 20 connections)
6. **Use streaming** for better UX
7. **Implement pagination** for large result sets
8. **Enable compression** (already configured)

---

## Security Checklist

- [ ] Change JWT_SECRET to random value
- [ ] Use strong DATABASE_URL password
- [ ] Enable SSL for database connections
- [ ] Set up rate limiting (done)
- [ ] Validate all inputs (done)
- [ ] Enable CORS only for your domain
- [ ] Use HTTPS in production
- [ ] Keep API keys secure
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity

---

## Quick Testing

### Test Chat

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","model":"openai","userId":"test"}'
```

### Test Memory

```bash
curl -X POST http://localhost:3000/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","content":"Test memory","role":"user"}'
```

### Test Search

```bash
curl -X POST http://localhost:3000/api/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test","userId":"test","limit":5}'
```

---

## Model Identifiers

- `openai` - GPT-4, GPT-3.5
- `anthropic` - Claude 3, Claude 2
- `google` - Gemini Pro
- `local` - Ollama or custom local models

---

## Support

🐛 **Issues**: Open on GitHub  
📖 **Docs**: Check `docs/` folder  
💬 **Questions**: See existing documentation  
🎓 **Examples**: `docs/API_EXAMPLES.md`

---

## Version Info

**Version**: 1.0.0  
**Release**: October 2025  
**Status**: Production Ready ✅  
**License**: MIT

---

**Print this card for quick reference!** 📋
