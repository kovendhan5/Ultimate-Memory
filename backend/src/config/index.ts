/**
 * Configuration management for Ultimate Memory
 */

export interface AppConfig {
  server: {
    port: number;
    env: string;
    apiVersion: string;
  };
  database: {
    url: string;
    type: 'memory' | 'postgresql' | 'mongodb';
  };
  redis: {
    url: string;
    enabled: boolean;
  };
  memory: {
    maxSize: number;
    maxContextTokens: number;
    embeddingModel: string;
    embeddingDimensions: number;
  };
  vectorDb: {
    type: 'local' | 'pinecone' | 'qdrant' | 'weaviate';
    apiKey?: string;
    url?: string;
    environment?: string;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    encryptionKey: string;
    bcryptRounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  features: {
    enableAnalytics: boolean;
    enableCompression: boolean;
    enablePIIDetection: boolean;
    autoSummarization: boolean;
  };
  cors: {
    origin: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
        env: process.env.NODE_ENV || 'development',
        apiVersion: process.env.API_VERSION || 'v1'
      },
      database: {
        url: process.env.DATABASE_URL || '',
        type: (process.env.DATABASE_TYPE as any) || 'memory'
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        enabled: process.env.REDIS_ENABLED === 'true'
      },
      memory: {
        maxSize: parseInt(process.env.MAX_MEMORY_SIZE || '10000', 10),
        maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '8000', 10),
        embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10)
      },
      vectorDb: {
        type: (process.env.VECTOR_DB_TYPE as any) || 'local',
        apiKey: process.env.PINECONE_API_KEY || process.env.QDRANT_API_KEY,
        url: process.env.QDRANT_URL || process.env.WEAVIATE_URL,
        environment: process.env.PINECONE_ENVIRONMENT
      },
      security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
        encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
      },
      features: {
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
        enablePIIDetection: process.env.ENABLE_PII_DETECTION === 'true',
        autoSummarization: process.env.AUTO_SUMMARIZATION === 'true'
      },
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
      }
    };
  }

  get(): AppConfig {
    return this.config;
  }

  getServer() {
    return this.config.server;
  }

  getDatabase() {
    return this.config.database;
  }

  getMemory() {
    return this.config.memory;
  }

  getVectorDb() {
    return this.config.vectorDb;
  }

  getSecurity() {
    return this.config.security;
  }

  getFeatures() {
    return this.config.features;
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.server.env === 'production') {
      if (this.config.security.jwtSecret === 'your-secret-key') {
        errors.push('JWT_SECRET must be changed in production');
      }
      if (this.config.security.encryptionKey === 'your-encryption-key') {
        errors.push('ENCRYPTION_KEY must be changed in production');
      }
    }

    if (this.config.vectorDb.type === 'pinecone' && !this.config.vectorDb.apiKey) {
      errors.push('PINECONE_API_KEY required when using Pinecone');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const config = new ConfigManager();
