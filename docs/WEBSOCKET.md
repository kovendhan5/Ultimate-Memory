# WebSocket & Real-Time Features Guide

## Overview

Ultimate Memory supports real-time features through WebSocket connections, enabling:

- **Streaming chat responses** (token-by-token)
- **Live typing indicators**
- **Real-time memory updates**
- **Online presence** tracking
- **Multi-device sync**

## Quick Start

### Backend Setup

WebSocket server is automatically initialized when the server starts:

```typescript
// Automatically done in index.ts
const httpServer = createServer(app);
const wsManager = initializeWebSocket(httpServer);
```

### Frontend Setup

```typescript
import { io } from "socket.io-client";

// Connect to WebSocket server
const socket = io("http://localhost:3000", {
  auth: {
    token: "your-jwt-token", // Optional for authenticated connections
  },
  transports: ["websocket", "polling"],
});

// Handle connection
socket.on("connect", () => {
  console.log("Connected to WebSocket");
});

// Handle disconnection
socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket");
});
```

## Features

### 1. Streaming Chat Responses

#### Option A: Server-Sent Events (SSE)

```typescript
// Frontend - React example
const streamChat = async (message: string, model: string) => {
  const response = await fetch("/api/v1/stream/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      model,
      conversationId: "conv-123",
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));

        switch (data.type) {
          case "start":
            console.log("Stream started:", data.messageId);
            break;

          case "chunk":
            // Append chunk to UI
            appendToMessage(data.chunk);
            break;

          case "done":
            console.log("Stream complete:", data.fullResponse);
            break;

          case "error":
            console.error("Stream error:", data.error);
            break;
        }
      }
    }
  }
};
```

#### Option B: WebSocket (Bidirectional)

```typescript
// Backend endpoint
POST / api / v1 / stream / chat - websocket;

// Frontend
const streamChatViaWebSocket = (message: string, model: string) => {
  // Subscribe to conversation updates
  socket.emit("subscribe:chat", { conversationId: "conv-123" });

  // Listen for chunks
  socket.on("chat:chunk", (data) => {
    if (data.done) {
      console.log("Stream complete");
    } else {
      appendToMessage(data.chunk);
    }
  });

  // Send chat request via REST API
  fetch("/api/v1/stream/chat-websocket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model, conversationId: "conv-123" }),
  });
};
```

### 2. Typing Indicators

```typescript
// When user starts typing
const onTypingStart = () => {
  socket.emit("typing:start", {
    conversationId: "conv-123",
  });
};

// When user stops typing
const onTypingStop = () => {
  socket.emit("typing:stop", {
    conversationId: "conv-123",
  });
};

// Listen for other users typing
socket.on("user:typing", (data) => {
  console.log(`${data.username} is typing in ${data.conversationId}`);
  showTypingIndicator(data.username);
});

socket.on("user:stopped-typing", (data) => {
  hideTypingIndicator(data.userId);
});
```

### 3. Real-Time Memory Updates

```typescript
// Listen for new memories
socket.on("memory:created", (memory) => {
  console.log("New memory:", memory);
  // Update UI with new memory
  addMemoryToList(memory);
});

// Listen for deleted memories
socket.on("memory:deleted", (data) => {
  console.log("Memory deleted:", data.id);
  // Remove from UI
  removeMemoryFromList(data.id);
});
```

### 4. Online Presence

```typescript
// Notify when coming online
socket.emit("presence:online");

// Listen for users coming online
socket.on("user:online", (data) => {
  console.log(`${data.username} is now online`);
  updateUserStatus(data.userId, "online");
});

// Listen for users going offline
socket.on("user:offline", (data) => {
  console.log(`User ${data.userId} went offline`);
  updateUserStatus(data.userId, "offline");
});
```

## React Example

### Custom Hook

```typescript
// hooks/useWebSocket.ts
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useWebSocket = (token?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, isConnected };
};
```

### Streaming Chat Component

```typescript
// components/StreamingChat.tsx
import { useState, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

export const StreamingChat = ({
  conversationId,
}: {
  conversationId: string;
}) => {
  const { socket, isConnected } = useWebSocket();
  const [message, setMessage] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to conversation
    socket.emit("subscribe:chat", { conversationId });

    // Listen for streaming chunks
    socket.on("chat:chunk", (data) => {
      if (data.done) {
        setIsStreaming(false);
      } else {
        setStreamingMessage((prev) => prev + data.chunk);
      }
    });

    // Listen for stream start
    socket.on("chat:start", (data) => {
      setIsStreaming(true);
      setStreamingMessage("");
    });

    return () => {
      socket.emit("unsubscribe:chat", { conversationId });
    };
  }, [socket, conversationId]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsStreaming(true);
    setStreamingMessage("");

    await fetch("/api/v1/stream/chat-websocket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        model: "openai",
        conversationId,
      }),
    });

    setMessage("");
  };

  return (
    <div>
      <div className="messages">
        {/* Your message history */}

        {isStreaming && (
          <div className="streaming-message">
            <span className="typing-indicator">AI is typing...</span>
            <p>{streamingMessage}</p>
          </div>
        )}
      </div>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Type a message..."
        disabled={!isConnected}
      />

      <button onClick={sendMessage} disabled={!isConnected || isStreaming}>
        {isConnected ? "Send" : "Connecting..."}
      </button>
    </div>
  );
};
```

## Backend API Reference

### WebSocketManager Methods

```typescript
// Get the WebSocket manager instance
import { getWebSocketManager } from "./middleware/websocket";

const wsManager = getWebSocketManager();

// Emit to specific user (all their sockets)
wsManager.emitToUser(userId, "event-name", { data: "value" });

// Emit to specific conversation
wsManager.emitToConversation(conversationId, "event-name", { data: "value" });

// Emit to all connected clients
wsManager.emitToAll("event-name", { data: "value" });

// Stream chat chunk
wsManager.streamChatChunk(conversationId, {
  messageId: "msg-123",
  chunk: "Hello",
  model: "openai",
  done: false,
});

// Notify about new memory
wsManager.notifyMemoryCreated(userId, memoryObject);

// Notify about deleted memory
wsManager.notifyMemoryDeleted(userId, memoryId);

// Check user status
const isOnline = wsManager.isUserOnline(userId);
const connectionCount = wsManager.getUserConnectionsCount(userId);
const onlineUsers = wsManager.getOnlineUserIds();
```

## Events Reference

### Client → Server Events

| Event              | Payload              | Description                       |
| ------------------ | -------------------- | --------------------------------- |
| `subscribe:chat`   | `{ conversationId }` | Subscribe to conversation updates |
| `unsubscribe:chat` | `{ conversationId }` | Unsubscribe from conversation     |
| `typing:start`     | `{ conversationId }` | User started typing               |
| `typing:stop`      | `{ conversationId }` | User stopped typing               |
| `presence:online`  | none                 | Notify online status              |

### Server → Client Events

| Event                 | Payload                                | Description            |
| --------------------- | -------------------------------------- | ---------------------- |
| `subscribed`          | `{ conversationId }`                   | Subscription confirmed |
| `chat:start`          | `{ messageId, model, conversationId }` | Chat stream starting   |
| `chat:chunk`          | `{ messageId, chunk, model, done }`    | Chat response chunk    |
| `user:typing`         | `{ userId, username, conversationId }` | User is typing         |
| `user:stopped-typing` | `{ userId, conversationId }`           | User stopped typing    |
| `user:online`         | `{ userId, username }`                 | User came online       |
| `user:offline`        | `{ userId }`                           | User went offline      |
| `memory:created`      | `{ memory }`                           | New memory created     |
| `memory:deleted`      | `{ id }`                               | Memory deleted         |
| `connect`             | none                                   | Connection established |
| `disconnect`          | none                                   | Connection lost        |
| `error`               | `{ error }`                            | Error occurred         |

## Security

### Authentication

```typescript
// Connect with JWT token
const socket = io("http://localhost:3000", {
  auth: {
    token: "your-jwt-token",
  },
});

// Anonymous connections are allowed but limited
// They get a temporary ID: `anon_${socket.id}`
```

### Authorization

- Users can only access their own data
- Conversations are protected by user ID
- Admin events require elevated permissions

### Rate Limiting

WebSocket connections are NOT rate-limited by default. Consider adding:

```typescript
// In your WebSocket middleware
const connectionAttempts = new Map();

socket.use((packet, next) => {
  const userId = socket.user?.id;
  // Implement rate limiting logic
  next();
});
```

## Monitoring

### Check Connected Users

```typescript
const wsManager = getWebSocketManager();

// In your analytics endpoint
app.get("/api/v1/analytics/websocket", (req, res) => {
  res.json({
    onlineUsers: wsManager.getOnlineUsersCount(),
    userIds: wsManager.getOnlineUserIds(),
  });
});
```

### Logging

All WebSocket events are logged automatically:

```
[INFO] WebSocket connected: user-123 (socket-abc)
[INFO] User user-123 subscribed to chat conv-456
[INFO] WebSocket disconnected: user-123 (socket-abc)
```

## Troubleshooting

### Connection Issues

```typescript
// Enable debug mode
const socket = io("http://localhost:3000", {
  debug: true,
});

// Check connection state
console.log("Connected:", socket.connected);
console.log("ID:", socket.id);
```

### CORS Issues

Update `backend/src/middleware/websocket.ts`:

```typescript
cors: {
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  methods: ['GET', 'POST'],
  credentials: true
}
```

### Reconnection

Socket.IO handles reconnection automatically:

```typescript
socket.on("reconnect", (attemptNumber) => {
  console.log("Reconnected after", attemptNumber, "attempts");
});

socket.on("reconnect_error", (error) => {
  console.error("Reconnection error:", error);
});
```

## Performance Tips

1. **Unsubscribe** when leaving conversations
2. **Throttle** typing indicators (max 1 per second)
3. **Batch** small updates instead of sending individually
4. **Use rooms** for conversation isolation
5. **Close** connections when component unmounts

## Production Checklist

- [ ] Configure CORS for production domains
- [ ] Add rate limiting for WebSocket events
- [ ] Set up Redis adapter for multi-server scaling
- [ ] Monitor connection counts and memory usage
- [ ] Implement heartbeat/ping-pong
- [ ] Add reconnection logic with exponential backoff
- [ ] Log important events for debugging
- [ ] Test with 100+ concurrent connections
- [ ] Set up monitoring and alerts
- [ ] Document all custom events

## Scaling with Redis

For multiple server instances:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

---

## Next Steps

1. ✅ Connect to WebSocket
2. ✅ Implement streaming chat
3. ✅ Add typing indicators
4. ✅ Test real-time updates
5. 🚀 Deploy with scaling!

For more examples, check the [API_EXAMPLES.md](./API_EXAMPLES.md) or [DEVELOPMENT.md](./DEVELOPMENT.md).
