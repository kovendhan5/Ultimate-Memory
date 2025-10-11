# API Usage Examples

## Using the Memory API

### Store a Conversation

```bash
curl -X POST http://localhost:3000/api/v1/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "conversationId": "conv-001",
    "messages": [
      {
        "role": "user",
        "content": "What is quantum computing?"
      },
      {
        "role": "assistant",
        "content": "Quantum computing is a type of computation that harnesses quantum mechanical phenomena..."
      }
    ],
    "model": "gpt-4",
    "metadata": {
      "tags": ["technology", "quantum", "computing"],
      "importance": "high"
    }
  }'
```

### Retrieve Memories with Semantic Search

```bash
curl -X POST http://localhost:3000/api/v1/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "query": "Tell me about quantum computers",
    "limit": 5,
    "minRelevance": 0.7
  }'
```

### Get Context for AI Model

```bash
curl -X POST http://localhost:3000/api/v1/memory/context \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "query": "Explain more about quantum computing",
    "conversationId": "conv-001",
    "maxTokens": 4000,
    "includeRelated": true
  }'
```

### Chat with AI (Auto-saves to Memory)

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "message": "What are the applications of quantum computing?",
    "conversationId": "conv-001",
    "useMemory": true,
    "options": {
      "temperature": 0.7,
      "maxTokens": 500
    }
  }'
```

### Get Memory Statistics

```bash
curl http://localhost:3000/api/v1/memory/stats/user123
```

### Delete a Memory

```bash
curl -X DELETE http://localhost:3000/api/v1/memory/mem-123 \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123"
  }'
```

### Get Available AI Providers

```bash
curl http://localhost:3000/api/v1/ai/providers
```

## JavaScript/TypeScript Examples

### Using with Fetch API

```javascript
// Store memory
async function storeMemory(userId, conversationId, messages) {
  const response = await fetch("http://localhost:3000/api/v1/memory/store", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      conversationId,
      messages,
      metadata: {
        tags: ["example"],
        importance: "medium",
      },
    }),
  });

  return await response.json();
}

// Chat with AI
async function chatWithAI(userId, message, provider = "openai") {
  const response = await fetch("http://localhost:3000/api/v1/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      provider,
      message,
      conversationId: `conv-${Date.now()}`,
      useMemory: true,
    }),
  });

  return await response.json();
}

// Retrieve memories
async function searchMemories(userId, query) {
  const response = await fetch("http://localhost:3000/api/v1/memory/retrieve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      query,
      limit: 10,
      minRelevance: 0.7,
    }),
  });

  return await response.json();
}
```

### Using with Axios

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api/v1",
});

// Store and retrieve in one workflow
async function aiConversationWorkflow() {
  // 1. Chat with AI (auto-saves)
  const chatResponse = await api.post("/ai/chat", {
    userId: "user123",
    provider: "openai",
    message: "Explain blockchain technology",
    conversationId: "conv-blockchain",
    useMemory: true,
  });

  console.log("AI Response:", chatResponse.data.data.message);

  // 2. Continue conversation with different model
  const claudeResponse = await api.post("/ai/chat", {
    userId: "user123",
    provider: "anthropic",
    message: "What are the main use cases?",
    conversationId: "conv-blockchain",
    useMemory: true, // Uses previous context
  });

  console.log("Claude Response:", claudeResponse.data.data.message);

  // 3. Search related memories
  const memories = await api.post("/memory/retrieve", {
    userId: "user123",
    query: "blockchain use cases",
    limit: 5,
  });

  console.log("Related Memories:", memories.data.data);
}
```

## Python Examples

```python
import requests

BASE_URL = "http://localhost:3000/api/v1"

def store_memory(user_id, conversation_id, messages):
    response = requests.post(
        f"{BASE_URL}/memory/store",
        json={
            "userId": user_id,
            "conversationId": conversation_id,
            "messages": messages,
            "metadata": {
                "tags": ["python", "example"],
                "importance": "medium"
            }
        }
    )
    return response.json()

def chat_with_ai(user_id, message, provider="openai"):
    response = requests.post(
        f"{BASE_URL}/ai/chat",
        json={
            "userId": user_id,
            "provider": provider,
            "message": message,
            "conversationId": f"conv-{int(time.time())}",
            "useMemory": True
        }
    )
    return response.json()

def search_memories(user_id, query):
    response = requests.post(
        f"{BASE_URL}/memory/retrieve",
        json={
            "userId": user_id,
            "query": query,
            "limit": 10,
            "minRelevance": 0.7
        }
    )
    return response.json()

# Usage
result = chat_with_ai("user123", "Explain neural networks")
print(result['data']['message'])
```

## Response Formats

### Successful Memory Storage

```json
{
  "success": true,
  "data": {
    "id": "mem-uuid-here",
    "userId": "user123",
    "conversationId": "conv-001",
    "messages": [...],
    "timestamp": "2025-10-11T10:30:00.000Z",
    "metadata": {...}
  }
}
```

### Successful Chat Response

```json
{
  "success": true,
  "data": {
    "message": "Here is the AI response...",
    "model": "gpt-4-turbo-preview",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350
    },
    "conversationId": "conv-001"
  }
}
```

### Error Response

```json
{
  "error": "Error message here",
  "status": 400
}
```
