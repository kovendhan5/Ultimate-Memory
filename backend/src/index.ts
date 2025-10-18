import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import aiRoutes from './api/routes/ai.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import memoryRoutes from './api/routes/memory.routes';
import streamingRoutes from './api/routes/streaming.routes';
import userRoutes from './api/routes/user.routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { initializeWebSocket } from './middleware/websocket';
import { DatabaseFactory } from './storage/DatabaseFactory';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression()); // Response compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter); // Rate limiting

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  });
});

// API Routes
const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${apiPrefix}/memory`, memoryRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/ai`, aiRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/stream`, streamingRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error Handler
app.use(errorHandler);

// Create HTTP server for WebSocket support
const httpServer = createServer(app);

// Initialize WebSocket
const wsManager = initializeWebSocket(httpServer);

// Initialize database on startup
async function startServer() {
  try {
    // Initialize database
    const db = await DatabaseFactory.getInstance();
    logger.info('✅ Database initialized successfully');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Ultimate Memory API server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
      logger.info(`📊 API: http://localhost:${PORT}${apiPrefix}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  try {
    await DatabaseFactory.closeDatabase();
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

export default app;
