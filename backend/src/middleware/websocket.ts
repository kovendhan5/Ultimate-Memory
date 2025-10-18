import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';
import { verifyToken } from './auth';
import { config } from '../config';

export interface SocketUser {
  id: string;
  email?: string;
  username?: string;
}

export interface AuthenticatedSocket extends SocketIOServer {
  user?: SocketUser;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.get('FRONTEND_URL') || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          // Allow anonymous connections but mark them
          socket.user = { id: `anon_${socket.id}` };
          return next();
        }

        const decoded = verifyToken(token);
        socket.user = {
          id: decoded.userId,
          email: decoded.email,
          username: decoded.username
        };

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Logging middleware
    this.io.use((socket: any, next) => {
      logger.info(`WebSocket connection attempt from ${socket.user?.id || 'anonymous'}`);
      next();
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: any) => {
      const userId = socket.user?.id;
      logger.info(`WebSocket connected: ${userId} (${socket.id})`);

      // Track user socket
      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);
      }

      // Join user-specific room
      if (userId) {
        socket.join(`user:${userId}`);
      }

      // Handle chat stream subscription
      socket.on('subscribe:chat', (data: { conversationId: string }) => {
        logger.debug(`User ${userId} subscribed to chat ${data.conversationId}`);
        socket.join(`chat:${data.conversationId}`);
        socket.emit('subscribed', { conversationId: data.conversationId });
      });

      // Handle unsubscribe
      socket.on('unsubscribe:chat', (data: { conversationId: string }) => {
        logger.debug(`User ${userId} unsubscribed from chat ${data.conversationId}`);
        socket.leave(`chat:${data.conversationId}`);
      });

      // Handle typing indicators
      socket.on('typing:start', (data: { conversationId: string }) => {
        socket.to(`chat:${data.conversationId}`).emit('user:typing', {
          userId,
          username: socket.user?.username,
          conversationId: data.conversationId
        });
      });

      socket.on('typing:stop', (data: { conversationId: string }) => {
        socket.to(`chat:${data.conversationId}`).emit('user:stopped-typing', {
          userId,
          conversationId: data.conversationId
        });
      });

      // Handle presence
      socket.on('presence:online', () => {
        if (userId) {
          this.io.emit('user:online', { userId, username: socket.user?.username });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`WebSocket disconnected: ${userId} (${socket.id})`);

        if (userId) {
          const userSocketSet = this.userSockets.get(userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(userId);
              this.io.emit('user:offline', { userId });
            }
          }
        }
      });

      // Error handling
      socket.on('error', (error: Error) => {
        logger.error(`WebSocket error for ${userId}:`, error);
      });
    });
  }

  // Emit to specific user (all their sockets)
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Emit to specific conversation
  emitToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(`chat:${conversationId}`).emit(event, data);
  }

  // Emit to all connected clients
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Stream chat response chunks
  streamChatChunk(conversationId: string, data: {
    messageId: string;
    chunk: string;
    model: string;
    done: boolean;
  }): void {
    this.emitToConversation(conversationId, 'chat:chunk', data);
  }

  // Notify about new memory
  notifyMemoryCreated(userId: string, memory: any): void {
    this.emitToUser(userId, 'memory:created', memory);
  }

  // Notify about memory deletion
  notifyMemoryDeleted(userId: string, memoryId: string): void {
    this.emitToUser(userId, 'memory:deleted', { id: memoryId });
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  // Get user's active connections count
  getUserConnectionsCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Get all online user IDs
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(httpServer: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(httpServer);
    logger.info('WebSocket server initialized');
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized. Call initializeWebSocket first.');
  }
  return wsManager;
}
