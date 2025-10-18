import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MemoryManager } from '../../core/MemoryManager';
import { AIModelFactory } from '../../integrations/AIModelFactory';
import { optionalAuth } from '../../middleware/auth';
import { getWebSocketManager } from '../../middleware/websocket';
import { logger } from '../../utils/logger';

const router = Router();

interface StreamChatRequest {
  message: string;
  model: string;
  conversationId?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * POST /api/stream/chat
 * Stream chat responses in real-time using Server-Sent Events (SSE)
 */
router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  const { message, model, conversationId, maxTokens, temperature, systemPrompt }: StreamChatRequest = req.body;
  const userId = (req as any).user?.userId || 'anonymous';

  if (!message || !model) {
    return res.status(400).json({
      success: false,
      error: 'Message and model are required'
    });
  }

  try {
    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const messageId = uuidv4();
    const memoryManager = MemoryManager.getInstance();

    // Get conversation context
    const context = await memoryManager.getContext(userId, conversationId);

    // Store user message
    await memoryManager.store(userId, {
      role: 'user',
      content: message,
      conversationId,
      metadata: { model, timestamp: new Date() }
    });

    // Build messages array
    const messages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...context.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      })),
      { role: 'user' as const, content: message }
    ];

    // Initialize AI model
    const aiClient = AIModelFactory.createClient(model);
    let fullResponse = '';

    // Send initial event
    res.write(`data: ${JSON.stringify({
      type: 'start',
      messageId,
      model,
      conversationId
    })}\n\n`);

    // Stream the response
    try {
      await aiClient.streamChat(
        messages,
        async (chunk: string) => {
          fullResponse += chunk;

          // Send chunk via SSE
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            messageId,
            chunk,
            model
          })}\n\n`);

          // Also broadcast via WebSocket if available
          try {
            const wsManager = getWebSocketManager();
            if (conversationId) {
              wsManager.streamChatChunk(conversationId, {
                messageId,
                chunk,
                model,
                done: false
              });
            }
          } catch (error) {
            // WebSocket not available, continue with SSE only
          }
        },
        {
          maxTokens,
          temperature
        }
      );

      // Store assistant response
      await memoryManager.store(userId, {
        role: 'assistant',
        content: fullResponse,
        conversationId,
        metadata: {
          model,
          messageId,
          timestamp: new Date()
        }
      });

      // Send completion event
      res.write(`data: ${JSON.stringify({
        type: 'done',
        messageId,
        fullResponse,
        model,
        conversationId
      })}\n\n`);

      // Final WebSocket notification
      try {
        const wsManager = getWebSocketManager();
        if (conversationId) {
          wsManager.streamChatChunk(conversationId, {
            messageId,
            chunk: '',
            model,
            done: true
          });
        }
      } catch (error) {
        // WebSocket not available
      }

    } catch (streamError) {
      logger.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        messageId,
        error: streamError instanceof Error ? streamError.message : 'Streaming failed'
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    logger.error('Stream chat error:', error);
    
    // If headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Stream failed'
      });
    }
    
    // Otherwise send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/stream/chat-websocket
 * Alternative streaming endpoint that uses WebSocket for bidirectional communication
 */
router.post('/chat-websocket', optionalAuth, async (req: Request, res: Response) => {
  const { message, model, conversationId, maxTokens, temperature, systemPrompt }: StreamChatRequest = req.body;
  const userId = (req as any).user?.userId || 'anonymous';

  if (!message || !model) {
    return res.status(400).json({
      success: false,
      error: 'Message and model are required'
    });
  }

  try {
    const wsManager = getWebSocketManager();
    const messageId = uuidv4();
    const memoryManager = MemoryManager.getInstance();

    // Get context
    const context = await memoryManager.getContext(userId, conversationId);

    // Store user message
    await memoryManager.store(userId, {
      role: 'user',
      content: message,
      conversationId,
      metadata: { model, timestamp: new Date() }
    });

    // Build messages
    const messages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...context.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      })),
      { role: 'user' as const, content: message }
    ];

    // Start streaming response
    const aiClient = AIModelFactory.createClient(model);
    let fullResponse = '';

    // Send start notification
    if (conversationId) {
      wsManager.emitToConversation(conversationId, 'chat:start', {
        messageId,
        model,
        conversationId
      });
    }

    await aiClient.streamChat(
      messages,
      async (chunk: string) => {
        fullResponse += chunk;
        
        if (conversationId) {
          wsManager.streamChatChunk(conversationId, {
            messageId,
            chunk,
            model,
            done: false
          });
        }
      },
      { maxTokens, temperature }
    );

    // Store response
    await memoryManager.store(userId, {
      role: 'assistant',
      content: fullResponse,
      conversationId,
      metadata: { model, messageId, timestamp: new Date() }
    });

    // Send completion
    if (conversationId) {
      wsManager.streamChatChunk(conversationId, {
        messageId,
        chunk: '',
        model,
        done: true
      });
    }

    return res.json({
      success: true,
      messageId,
      conversationId,
      message: 'Response streaming via WebSocket'
    });

  } catch (error) {
    logger.error('WebSocket chat error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Chat failed'
    });
  }
});

export default router;
