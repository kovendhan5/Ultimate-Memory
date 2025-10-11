import { Request, Response, Router } from 'express';
import { MemoryManager } from '../../core/MemoryManager';
import { AIModelFactory, AIProvider } from '../../integrations/AIModelFactory';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
const memoryManager = new MemoryManager();

/**
 * POST /api/v1/ai/chat
 * Chat with any AI model using shared memory
 */
router.post('/chat', async (req: Request, res: Response, next) => {
  try {
    const {
      userId,
      provider,
      model,
      message,
      conversationId,
      useMemory = true,
      options
    } = req.body;

    if (!userId || !provider || !message) {
      throw new AppError('userId, provider, and message are required', 400);
    }

    // Get conversation context from memory
    let messages = [];
    if (useMemory) {
      const context = await memoryManager.getContext(userId, message, {
        conversationId,
        maxTokens: options?.maxContextTokens || 4000,
        includeRelated: true
      });
      messages = context;
    }

    // Add current user message
    messages.push({
      role: 'user' as const,
      content: message
    });

    // Get AI response
    const client = AIModelFactory.getClient(provider as AIProvider, model);
    const response = await client.chat(messages, options);

    // Store interaction in memory
    if (useMemory) {
      await memoryManager.store({
        userId,
        conversationId: conversationId || `conv-${Date.now()}`,
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: response.content }
        ],
        model: response.model,
        metadata: {
          tags: options?.tags,
          importance: options?.importance || 'medium'
        }
      });
    }

    res.json({
      success: true,
      data: {
        message: response.content,
        model: response.model,
        usage: response.usage,
        conversationId
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/ai/chat/stream
 * Streaming chat with any AI model
 */
router.post('/chat/stream', async (req: Request, res: Response, next) => {
  try {
    const {
      userId,
      provider,
      model,
      message,
      conversationId,
      useMemory = true,
      options
    } = req.body;

    if (!userId || !provider || !message) {
      throw new AppError('userId, provider, and message are required', 400);
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get context
    let messages = [];
    if (useMemory) {
      const context = await memoryManager.getContext(userId, message, {
        conversationId,
        maxTokens: options?.maxContextTokens || 4000
      });
      messages = context;
    }

    messages.push({
      role: 'user' as const,
      content: message
    });

    // Stream response
    const client = AIModelFactory.getClient(provider as AIProvider, model);
    
    if (!client.streamChat) {
      throw new AppError('Streaming not supported for this provider', 400);
    }

    let fullResponse = '';
    for await (const chunk of client.streamChat(messages, options)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Store in memory
    if (useMemory) {
      await memoryManager.store({
        userId,
        conversationId: conversationId || `conv-${Date.now()}`,
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: fullResponse }
        ],
        model: model || 'unknown'
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/ai/providers
 * List available AI providers
 */
router.get('/providers', (req: Request, res: Response) => {
  const providers = AIModelFactory.getAvailableProviders();
  const defaultModels = AIModelFactory.getDefaultModels();

  res.json({
    success: true,
    data: {
      providers,
      defaultModels
    }
  });
});

export default router;
