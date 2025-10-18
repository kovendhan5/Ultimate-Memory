import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface Memory {
  id: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  model?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  embedding?: number[];
  conversationId?: string;
  importance?: number;
  tags?: string[];
}

export interface MemoryFilter {
  userId?: string;
  conversationId?: string;
  startDate?: Date;
  endDate?: Date;
  role?: 'user' | 'assistant' | 'system';
  model?: string;
  tags?: string[];
  minImportance?: number;
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByRole: Record<string, number>;
  memoriesByModel: Record<string, number>;
  averageImportance: number;
  oldestMemory?: Date;
  newestMemory?: Date;
  totalUsers: number;
  totalConversations: number;
}

export class PostgresDatabaseService {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor() {
    const dbUrl = config.get('DATABASE_URL');
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for PostgreSQL');
    }

    this.pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: config.get('NODE_ENV') === 'production' ? {
        rejectUnauthorized: false
      } : undefined
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.createTables();
      this.isInitialized = true;
      logger.info('PostgreSQL database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          username VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create memories table with vector support
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          role VARCHAR(50) NOT NULL,
          model VARCHAR(100),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          importance FLOAT DEFAULT 1.0,
          tags TEXT[] DEFAULT '{}',
          metadata JSONB DEFAULT '{}'::jsonb,
          embedding vector(1536)
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_memories_conversation_id ON memories(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_memories_role ON memories(role);
        CREATE INDEX IF NOT EXISTS idx_memories_model ON memories(model);
        CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
        CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);

      // Try to create vector index (requires pgvector extension)
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_memories_embedding 
          ON memories USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
        logger.info('pgvector extension enabled with vector index');
      } catch (vectorError) {
        logger.warn('pgvector extension not available. Vector search will use application-level cosine similarity.');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async insertMemory(memory: Memory): Promise<void> {
    const query = `
      INSERT INTO memories (
        id, user_id, conversation_id, content, role, model, 
        timestamp, importance, tags, metadata, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      memory.id,
      memory.userId,
      memory.conversationId || null,
      memory.content,
      memory.role,
      memory.model || null,
      memory.timestamp,
      memory.importance || 1.0,
      memory.tags || [],
      JSON.stringify(memory.metadata || {}),
      memory.embedding ? `[${memory.embedding.join(',')}]` : null
    ];

    try {
      await this.pool.query(query, values);
      logger.debug(`Memory inserted: ${memory.id}`);
    } catch (error) {
      logger.error(`Failed to insert memory ${memory.id}:`, error);
      throw error;
    }
  }

  async getMemories(filter: MemoryFilter = {}, limit?: number, offset?: number): Promise<Memory[]> {
    let query = 'SELECT * FROM memories WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filter.userId) {
      query += ` AND user_id = $${paramCount++}`;
      values.push(filter.userId);
    }

    if (filter.conversationId) {
      query += ` AND conversation_id = $${paramCount++}`;
      values.push(filter.conversationId);
    }

    if (filter.role) {
      query += ` AND role = $${paramCount++}`;
      values.push(filter.role);
    }

    if (filter.model) {
      query += ` AND model = $${paramCount++}`;
      values.push(filter.model);
    }

    if (filter.startDate) {
      query += ` AND timestamp >= $${paramCount++}`;
      values.push(filter.startDate);
    }

    if (filter.endDate) {
      query += ` AND timestamp <= $${paramCount++}`;
      values.push(filter.endDate);
    }

    if (filter.minImportance !== undefined) {
      query += ` AND importance >= $${paramCount++}`;
      values.push(filter.minImportance);
    }

    if (filter.tags && filter.tags.length > 0) {
      query += ` AND tags && $${paramCount++}`;
      values.push(filter.tags);
    }

    query += ' ORDER BY timestamp DESC';

    if (limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(limit);
    }

    if (offset) {
      query += ` OFFSET $${paramCount++}`;
      values.push(offset);
    }

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToMemory(row));
    } catch (error) {
      logger.error('Failed to get memories:', error);
      throw error;
    }
  }

  async getMemoryById(id: string): Promise<Memory | null> {
    const query = 'SELECT * FROM memories WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToMemory(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to get memory ${id}:`, error);
      throw error;
    }
  }

  async deleteMemory(id: string): Promise<boolean> {
    const query = 'DELETE FROM memories WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error(`Failed to delete memory ${id}:`, error);
      throw error;
    }
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.importance !== undefined) {
      fields.push(`importance = $${paramCount++}`);
      values.push(updates.importance);
    }

    if (updates.tags !== undefined) {
      fields.push(`tags = $${paramCount++}`);
      values.push(updates.tags);
    }

    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updates.embedding !== undefined) {
      fields.push(`embedding = $${paramCount++}`);
      values.push(updates.embedding ? `[${updates.embedding.join(',')}]` : null);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const query = `UPDATE memories SET ${fields.join(', ')} WHERE id = $${paramCount}`;

    try {
      const result = await this.pool.query(query, values);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error(`Failed to update memory ${id}:`, error);
      throw error;
    }
  }

  async getMemoryStats(userId?: string): Promise<MemoryStats> {
    let query = `
      SELECT
        COUNT(*) as total_memories,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT conversation_id) as total_conversations,
        AVG(importance) as avg_importance,
        MIN(timestamp) as oldest_memory,
        MAX(timestamp) as newest_memory,
        json_object_agg(role, role_count) as memories_by_role,
        json_object_agg(model, model_count) as memories_by_model
      FROM (
        SELECT
          user_id,
          conversation_id,
          importance,
          timestamp,
          role,
          model,
          COUNT(*) OVER (PARTITION BY role) as role_count,
          COUNT(*) OVER (PARTITION BY model) as model_count
        FROM memories
    `;

    const values: any[] = [];
    if (userId) {
      query += ' WHERE user_id = $1';
      values.push(userId);
    }

    query += ') subquery';

    try {
      const result = await this.pool.query(query, values);
      const row = result.rows[0];

      return {
        totalMemories: parseInt(row.total_memories || '0'),
        totalUsers: parseInt(row.total_users || '0'),
        totalConversations: parseInt(row.total_conversations || '0'),
        averageImportance: parseFloat(row.avg_importance || '0'),
        oldestMemory: row.oldest_memory,
        newestMemory: row.newest_memory,
        memoriesByRole: row.memories_by_role || {},
        memoriesByModel: row.memories_by_model || {}
      };
    } catch (error) {
      logger.error('Failed to get memory stats:', error);
      throw error;
    }
  }

  async searchBySimilarity(embedding: number[], limit: number = 10, userId?: string): Promise<Memory[]> {
    const embeddingStr = `[${embedding.join(',')}]`;
    
    let query = `
      SELECT *, 
        1 - (embedding <=> $1::vector) as similarity
      FROM memories
      WHERE embedding IS NOT NULL
    `;

    const values: any[] = [embeddingStr];
    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    query += ` ORDER BY embedding <=> $1::vector LIMIT ${limit}`;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToMemory(row));
    } catch (error) {
      // Fallback to getting all memories if vector search fails
      logger.warn('Vector search failed, using fallback:', error);
      const memories = await this.getMemories(userId ? { userId } : {}, limit);
      return this.calculateSimilarityInApp(memories, embedding).slice(0, limit);
    }
  }

  private calculateSimilarityInApp(memories: Memory[], queryEmbedding: number[]): Memory[] {
    return memories
      .filter(m => m.embedding && m.embedding.length > 0)
      .map(memory => {
        const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding!);
        return { ...memory, similarity };
      })
      .sort((a: any, b: any) => b.similarity - a.similarity);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private mapRowToMemory(row: any): Memory {
    return {
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      content: row.content,
      role: row.role,
      model: row.model,
      timestamp: new Date(row.timestamp),
      importance: row.importance,
      tags: row.tags || [],
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      embedding: row.embedding
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('PostgreSQL connection pool closed');
  }

  // Conversation management
  async createConversation(id: string, userId: string, title?: string, metadata?: Record<string, any>): Promise<void> {
    const query = `
      INSERT INTO conversations (id, user_id, title, metadata)
      VALUES ($1, $2, $3, $4)
    `;

    await this.pool.query(query, [id, userId, title || 'New Conversation', JSON.stringify(metadata || {})]);
  }

  async getConversations(userId: string, limit?: number, offset?: number): Promise<any[]> {
    let query = 'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC';
    const values: any[] = [userId];

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM conversations WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
}
