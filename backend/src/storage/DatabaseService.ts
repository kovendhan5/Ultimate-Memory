import { MemoryEntry, MemoryQuery } from '../core/MemoryManager';
import { logger } from '../utils/logger';

/**
 * In-memory database service
 * For production, use PostgreSQL or another persistent database
 */
export class DatabaseService {
  private memories: Map<string, MemoryEntry>;

  constructor() {
    this.memories = new Map();
  }

  /**
   * Insert a memory entry
   */
  async insertMemory(memory: MemoryEntry): Promise<void> {
    this.memories.set(memory.id, memory);
    logger.debug(`Memory inserted: ${memory.id}`);
  }

  /**
   * Get memories by IDs
   */
  async getMemoriesByIds(ids: string[]): Promise<MemoryEntry[]> {
    const memories: MemoryEntry[] = [];
    
    for (const id of ids) {
      const memory = this.memories.get(id);
      if (memory) {
        memories.push(memory);
      }
    }

    return memories;
  }

  /**
   * Get memories based on query
   */
  async getMemories(query: Partial<MemoryQuery>): Promise<MemoryEntry[]> {
    let memories = Array.from(this.memories.values());

    // Filter by userId
    if (query.userId) {
      memories = memories.filter(m => m.userId === query.userId);
    }

    // Filter by conversationId
    if (query.conversationId) {
      memories = memories.filter(m => m.conversationId === query.conversationId);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      memories = memories.filter(m => {
        const memoryTags = m.metadata?.tags || [];
        return query.tags!.some(tag => memoryTags.includes(tag));
      });
    }

    // Filter by date range
    if (query.startDate) {
      memories = memories.filter(m => m.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      memories = memories.filter(m => m.timestamp <= query.endDate!);
    }

    // Sort by timestamp (most recent first)
    memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (query.limit) {
      memories = memories.slice(0, query.limit);
    }

    return memories;
  }

  /**
   * Delete a memory entry
   */
  async deleteMemory(id: string): Promise<void> {
    this.memories.delete(id);
    logger.debug(`Memory deleted: ${id}`);
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<any> {
    const userMemories = Array.from(this.memories.values())
      .filter(m => m.userId === userId);

    const conversations = new Set(userMemories.map(m => m.conversationId));
    const totalMessages = userMemories.reduce(
      (sum, m) => sum + m.messages.length,
      0
    );

    const tags = new Map<string, number>();
    userMemories.forEach(m => {
      const memoryTags = m.metadata?.tags || [];
      memoryTags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });

    return {
      totalMemories: userMemories.length,
      totalConversations: conversations.size,
      totalMessages,
      topTags: Array.from(tags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      oldestMemory: userMemories.length > 0
        ? Math.min(...userMemories.map(m => m.timestamp.getTime()))
        : null,
      newestMemory: userMemories.length > 0
        ? Math.max(...userMemories.map(m => m.timestamp.getTime()))
        : null
    };
  }

  /**
   * Clear all data (for testing)
   */
  async clear(): Promise<void> {
    this.memories.clear();
    logger.info('Database cleared');
  }
}
