import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { MemoryManager } from '../../core/MemoryManager';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
const memoryManager = new MemoryManager();

// Validation schemas
const storeSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    metadata: z.record(z.any()).optional()
  })),
  model: z.string().optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    importance: z.enum(['low', 'medium', 'high']).optional(),
    context: z.string().optional()
  }).optional()
});

const querySchema = z.object({
  userId: z.string(),
  query: z.string().optional(),
  conversationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  minRelevance: z.number().min(0).max(1).optional()
});

/**
 * POST /api/v1/memory/store
 * Store a new memory entry
 */
router.post('/store', async (req: Request, res: Response, next) => {
  try {
    const data = storeSchema.parse(req.body);
    const memory = await memoryManager.store(data);
    
    res.status(201).json({
      success: true,
      data: memory
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError('Invalid request data: ' + error.message, 400));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/v1/memory/retrieve
 * Retrieve memories based on query
 */
router.post('/retrieve', async (req: Request, res: Response, next) => {
  try {
    const query = querySchema.parse(req.body);
    const memories = await memoryManager.retrieve(query);
    
    res.json({
      success: true,
      count: memories.length,
      data: memories
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError('Invalid query parameters: ' + error.message, 400));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/v1/memory/context
 * Get conversation context for AI model
 */
router.post('/context', async (req: Request, res: Response, next) => {
  try {
    const { userId, query, conversationId, maxTokens, includeRelated } = req.body;
    
    if (!userId || !query) {
      throw new AppError('userId and query are required', 400);
    }

    const context = await memoryManager.getContext(userId, query, {
      conversationId,
      maxTokens,
      includeRelated
    });
    
    res.json({
      success: true,
      count: context.length,
      data: context
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/memory/:memoryId
 * Delete a specific memory
 */
router.delete('/:memoryId', async (req: Request, res: Response, next) => {
  try {
    const { memoryId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new AppError('userId is required', 400);
    }

    await memoryManager.delete(userId, memoryId);
    
    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/memory/conversation/:conversationId
 * Delete all memories in a conversation
 */
router.delete('/conversation/:conversationId', async (req: Request, res: Response, next) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new AppError('userId is required', 400);
    }

    await memoryManager.delete(userId, undefined, conversationId);
    
    res.json({
      success: true,
      message: 'Conversation memories deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/memory/stats/:userId
 * Get memory statistics for a user
 */
router.get('/stats/:userId', async (req: Request, res: Response, next) => {
  try {
    const { userId } = req.params;
    const stats = await memoryManager.getStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;
