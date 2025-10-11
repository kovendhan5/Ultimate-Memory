import OpenAI from 'openai';
import { logger } from '../utils/logger';

interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

interface SearchQuery {
  vector: number[];
  limit?: number;
  filter?: Record<string, any>;
}

/**
 * Local vector store implementation
 * For production, consider using Pinecone, Qdrant, or Weaviate
 */
export class VectorStore {
  private openai: OpenAI;
  private vectors: Map<string, VectorEntry>;
  private embeddingModel: string;

  constructor() {
    this.vectors = new Map();
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      logger.warn('OpenAI API key not found, embeddings will not work');
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Insert vector into store
   */
  async insert(entry: VectorEntry): Promise<void> {
    this.vectors.set(entry.id, entry);
    logger.debug(`Vector inserted: ${entry.id}`);
  }

  /**
   * Search for similar vectors
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const [id, entry] of this.vectors.entries()) {
      // Apply filters
      if (query.filter) {
        let matches = true;
        for (const [key, value] of Object.entries(query.filter)) {
          if (value !== undefined && entry.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(query.vector, entry.vector);
      
      results.push({
        id,
        score: similarity,
        metadata: entry.metadata
      });
    }

    // Sort by similarity score (descending)
    results.sort((a, b) => b.score - a.score);

    // Return top results
    const limit = query.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * Delete vector from store
   */
  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
    logger.debug(`Vector deleted: ${id}`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Get store statistics
   */
  getStats(): { totalVectors: number } {
    return {
      totalVectors: this.vectors.size
    };
  }
}
