import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';
import { PostgresDatabaseService } from './PostgresDatabaseService';

export type DatabaseType = 'memory' | 'postgresql' | 'postgres';

export class DatabaseFactory {
  private static instance: DatabaseService | PostgresDatabaseService | null = null;

  static async createDatabase(): Promise<DatabaseService | PostgresDatabaseService> {
    if (this.instance) {
      return this.instance;
    }

    const dbType = (config.get('DATABASE_TYPE') || 'memory').toLowerCase() as DatabaseType;

    logger.info(`Initializing database: ${dbType}`);

    switch (dbType) {
      case 'postgresql':
      case 'postgres':
        const pgService = new PostgresDatabaseService();
        await pgService.initialize();
        this.instance = pgService;
        return pgService;

      case 'memory':
      default:
        const memService = new DatabaseService();
        await memService.initialize();
        this.instance = memService;
        return memService;
    }
  }

  static async getInstance(): Promise<DatabaseService | PostgresDatabaseService> {
    if (!this.instance) {
      return await this.createDatabase();
    }
    return this.instance;
  }

  static async closeDatabase(): Promise<void> {
    if (this.instance) {
      if ('close' in this.instance && typeof this.instance.close === 'function') {
        await this.instance.close();
      }
      this.instance = null;
      logger.info('Database connection closed');
    }
  }
}
