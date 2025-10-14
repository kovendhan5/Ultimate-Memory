# Docker Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker installed
- Docker Compose installed

### 1. Create Environment File

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:password@postgres:5432/ultimate_memory
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# AI API Keys
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-key-here

# Security (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 2. Build and Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### 3. Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Services

### Backend
- Node.js API server
- Runs on port 3000
- Connects to PostgreSQL and Redis

### Frontend
- React application served by Nginx
- Runs on port 80
- Proxies API requests to backend

### PostgreSQL
- Primary database
- Persistent storage for memories
- Data stored in Docker volume

### Redis
- Caching layer
- Session storage
- Rate limiting

## Production Deployment

### 1. Build for Production

```bash
# Build all images
docker-compose build

# Tag images
docker tag ultimate-memory-backend:latest your-registry/ultimate-memory-backend:v1.0.0
docker tag ultimate-memory-frontend:latest your-registry/ultimate-memory-frontend:v1.0.0

# Push to registry
docker push your-registry/ultimate-memory-backend:v1.0.0
docker push your-registry/ultimate-memory-frontend:v1.0.0
```

### 2. Deploy to Server

```bash
# On your server
docker pull your-registry/ultimate-memory-backend:v1.0.0
docker pull your-registry/ultimate-memory-frontend:v1.0.0

# Start with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Set Up SSL (with Let's Encrypt)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # ... existing services ...

  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
    networks:
      - ultimate-memory-network

  letsencrypt:
    image: nginxproxy/acme-companion
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - certs:/etc/nginx/certs
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - acme:/etc/acme.sh
    environment:
      - DEFAULT_EMAIL=your-email@example.com
    depends_on:
      - nginx-proxy
    networks:
      - ultimate-memory-network

volumes:
  certs:
  vhost:
  html:
  acme:
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Add load balancer
# Use nginx-proxy or Traefik
```

### Monitoring

```bash
# View resource usage
docker stats

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Health checks
curl http://localhost:3000/health
```

## Backup & Restore

### Backup PostgreSQL

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres ultimate_memory > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres ultimate_memory < backup.sql
```

### Backup Volumes

```bash
# Backup volumes
docker run --rm -v ultimate-memory_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

docker run --rm -v ultimate-memory_redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Check if port is in use
netstat -an | grep 3000

# Restart service
docker-compose restart backend
```

### Database connection issues

```bash
# Check if postgres is running
docker-compose ps postgres

# Test connection
docker-compose exec backend npm run db:test

# Reset database
docker-compose down
docker volume rm ultimate-memory_postgres-data
docker-compose up -d
```

### Out of memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Or add to docker-compose.yml:
services:
  backend:
    mem_limit: 512m
    memswap_limit: 512m
```

## Environment Variables

All environment variables can be set in `.env` file:

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Redis
REDIS_URL=redis://redis:6379

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Security
JWT_SECRET=min-32-characters
ENCRYPTION_KEY=exactly-32-characters

# Features
ENABLE_ANALYTICS=true
ENABLE_COMPRESSION=true
ENABLE_PII_DETECTION=true
AUTO_SUMMARIZATION=true

# Logging
LOG_LEVEL=info
```

## Security Best Practices

1. **Change default passwords**
   ```env
   POSTGRES_PASSWORD=use-strong-password-here
   JWT_SECRET=use-long-random-string-min-32-chars
   ```

2. **Use secrets management**
   - Docker Secrets
   - AWS Secrets Manager
   - HashiCorp Vault

3. **Enable SSL/TLS**
   - Use Let's Encrypt
   - Configure HTTPS only

4. **Network security**
   - Use private networks
   - Firewall rules
   - VPC isolation

5. **Regular updates**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove all (including volumes - WARNING: deletes data!)
docker-compose down -v

# Remove images
docker rmi ultimate-memory-backend ultimate-memory-frontend

# Clean up Docker system
docker system prune -a
```
