# Ultimate Memory Development Guide

## Architecture Overview

Ultimate Memory is built with a modern full-stack architecture:

### Backend (Node.js + TypeScript)

- **Express**: REST API framework
- **Core Components**:
  - `MemoryManager`: Central memory storage and retrieval logic
  - `AIModelFactory`: Multi-provider AI integration
  - `VectorStore`: Semantic search using embeddings
  - `DatabaseService`: Data persistence layer

### Frontend (React + TypeScript)

- **React 18**: UI framework
- **React Router**: Navigation
- **TanStack Query**: Data fetching and caching
- **Tailwind CSS**: Styling

## Key Concepts

### Memory Storage

Memories are stored with:

- User messages and AI responses
- Embeddings for semantic search
- Metadata (tags, importance, context)
- Timestamps and conversation IDs

### Context Retrieval

When a user sends a message:

1. Generate embedding for the query
2. Search vector store for similar memories
3. Retrieve relevant conversation history
4. Optimize context to fit within token limits
5. Send to AI model with full context

### Multi-Model Support

The system supports switching between AI models while maintaining shared memory:

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3, Claude 2)
- Google (Gemini Pro)
- Local models (Ollama)

## API Endpoints

### Memory Endpoints

```
POST /api/v1/memory/store
POST /api/v1/memory/retrieve
POST /api/v1/memory/context
DELETE /api/v1/memory/:memoryId
GET /api/v1/memory/stats/:userId
```

### AI Endpoints

```
POST /api/v1/ai/chat
POST /api/v1/ai/chat/stream
GET /api/v1/ai/providers
```

## Adding a New AI Provider

1. Create a new client class in `backend/src/integrations/`:

```typescript
import { AIClient, AIResponse } from "./AIModelFactory";
import { Message } from "../core/MemoryManager";

export class NewProviderClient implements AIClient {
  async chat(messages: Message[], options?: any): Promise<AIResponse> {
    // Implementation
  }
}
```

2. Register in `AIModelFactory.ts`:

```typescript
case 'newprovider':
  return new NewProviderClient(model);
```

3. Add to environment variables in `.env.example`

## Database Migration (Future)

Current implementation uses in-memory storage. To migrate to PostgreSQL:

1. Install pg: `npm install pg`
2. Create schema:

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  conversation_id VARCHAR(255),
  messages JSONB,
  model VARCHAR(100),
  timestamp TIMESTAMP,
  metadata JSONB,
  embedding VECTOR(1536)
);
```

3. Update `DatabaseService.ts` to use pg client

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Deployment

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
# Serve the dist folder with your preferred hosting service
```

## Environment Variables

See `.env.example` for all configuration options.

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Run `npm install` in both backend and frontend
2. **API connection errors**: Check CORS settings and API URL
3. **Embedding errors**: Ensure OpenAI API key is valid
4. **Memory not persisting**: Currently using in-memory storage - data resets on restart

## Performance Optimization

- Use Redis for caching
- Implement pagination for large memory sets
- Use connection pooling for database
- Compress API responses
- Implement request batching

## Security Considerations

- Never commit API keys
- Use environment variables
- Implement rate limiting (already included)
- Validate all inputs (using Zod)
- Sanitize user content
- Use HTTPS in production
- Implement authentication (TODO)

## Roadmap

- [ ] PostgreSQL integration
- [ ] User authentication
- [ ] Real-time collaboration
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Browser extension
- [ ] Self-hosted option
