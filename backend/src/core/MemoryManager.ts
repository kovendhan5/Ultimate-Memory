import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../storage/DatabaseService';
import { VectorStore } from '../storage/VectorStore';
import { logger } from '../utils/logger';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  conversationId: string;
  messages: Message[];
  model?: string;
  timestamp: Date;
  metadata?: {
    tags?: string[];
    importance?: 'low' | 'medium' | 'high';
    context?: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface MemoryQuery {
  userId: string;
  query?: string;
  conversationId?: string;
  tags?: string[];
  limit?: number;
  minRelevance?: number;
  startDate?: Date;
  endDate?: Date;
}

export class MemoryManager {
  private vectorStore: VectorStore;
  private db: DatabaseService;
  private maxMemorySize: number;

  constructor() {
    this.vectorStore = new VectorStore();
    this.db = new DatabaseService();
    this.maxMemorySize = parseInt(process.env.MAX_MEMORY_SIZE || '10000', 10);
  }

  /**
   * Store a new memory entry
   */
  async store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    try {
      const memoryEntry: MemoryEntry = {
        ...entry,
        id: uuidv4(),
        timestamp: new Date()
      };

      // Generate embedding for semantic search
      const textContent = this.extractTextContent(memoryEntry.messages);
      const embedding = await this.vectorStore.generateEmbedding(textContent);
      memoryEntry.embedding = embedding;

      // Store in database
      await this.db.insertMemory(memoryEntry);

      // Store in vector database for similarity search
      await this.vectorStore.insert({
        id: memoryEntry.id,
        vector: embedding,
        metadata: {
          userId: memoryEntry.userId,
          conversationId: memoryEntry.conversationId,
          timestamp: memoryEntry.timestamp.toISOString(),
          tags: memoryEntry.metadata?.tags || []
        }
      });

      logger.info(`Memory stored: ${memoryEntry.id}`, {
        userId: memoryEntry.userId,
        conversationId: memoryEntry.conversationId
      });

      return memoryEntry;
    } catch (error) {
      logger.error('Failed to store memory', error);
      throw new Error('Failed to store memory entry');
    }
  }

  /**
   * Retrieve relevant memories based on query
   */
  async retrieve(query: MemoryQuery): Promise<MemoryEntry[]> {
    try {
      let memories: MemoryEntry[] = [];

      if (query.query) {
        // Semantic search using vector similarity
        const queryEmbedding = await this.vectorStore.generateEmbedding(query.query);
        const similarMemories = await this.vectorStore.search({
          vector: queryEmbedding,
          limit: query.limit || 10,
          filter: {
            userId: query.userId,
            conversationId: query.conversationId,
            tags: query.tags
          }
        });

        // Fetch full memory entries
        const memoryIds = similarMemories
          .filter(m => m.score >= (query.minRelevance || 0.7))
          .map(m => m.id);
        
        memories = await this.db.getMemoriesByIds(memoryIds);
      } else {
        // Regular database query
        memories = await this.db.getMemories({
          userId: query.userId,
          conversationId: query.conversationId,
          tags: query.tags,
          limit: query.limit,
          startDate: query.startDate,
          endDate: query.endDate
        });
      }

      logger.info(`Retrieved ${memories.length} memories`, {
        userId: query.userId,
        hasQuery: !!query.query
      });

      return memories;
    } catch (error) {
      logger.error('Failed to retrieve memories', error);
      throw new Error('Failed to retrieve memories');
    }
  }

  /**
   * Get conversation context for AI model
   */
  async getContext(
    userId: string,
    currentQuery: string,
    options?: {
      conversationId?: string;
      maxTokens?: number;
      includeRelated?: boolean;
    }
  ): Promise<Message[]> {
    try {
      const memories = await this.retrieve({
        userId,
        query: options?.includeRelated ? currentQuery : undefined,
        conversationId: options?.conversationId,
        limit: 20
      });

      // Convert memories to message format
      let messages: Message[] = [];
      for (const memory of memories) {
        messages.push(...memory.messages);
      }

      // Optimize context to fit within token limit
      if (options?.maxTokens) {
        messages = this.optimizeContext(messages, options.maxTokens);
      }

      return messages;
    } catch (error) {
      logger.error('Failed to get context', error);
      throw new Error('Failed to get conversation context');
    }
  }

  /**
   * Delete memories
   */
  async delete(userId: string, memoryId?: string, conversationId?: string): Promise<void> {
    try {
      if (memoryId) {
        await this.db.deleteMemory(memoryId);
        await this.vectorStore.delete(memoryId);
      } else if (conversationId) {
        const memories = await this.db.getMemories({ userId, conversationId });
        for (const memory of memories) {
          await this.db.deleteMemory(memory.id);
          await this.vectorStore.delete(memory.id);
        }
      }

      logger.info('Memories deleted', { userId, memoryId, conversationId });
    } catch (error) {
      logger.error('Failed to delete memories', error);
      throw new Error('Failed to delete memories');
    }
  }

  /**
   * Extract text content from messages
   */
  private extractTextContent(messages: Message[]): string {
    return messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  }

  /**
   * Optimize context to fit within token limit
   */
  private optimizeContext(messages: Message[], maxTokens: number): Message[] {
    // Simple approximation: 1 token ≈ 4 characters
    const estimatedTokens = (text: string) => Math.ceil(text.length / 4);
    
    let totalTokens = 0;
    const optimizedMessages: Message[] = [];

    // Start from most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = estimatedTokens(message.content);
      
      if (totalTokens + messageTokens <= maxTokens) {
        optimizedMessages.unshift(message);
        totalTokens += messageTokens;
      } else {
        break;
      }
    }

    return optimizedMessages;
  }

  /**
   * Get memory statistics
   */
  async getStats(userId: string): Promise<any> {
    return this.db.getMemoryStats(userId);
  }
}
