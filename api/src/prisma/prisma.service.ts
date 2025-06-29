import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static instance: PrismaService;
  private isConnected = false;

  constructor() {
    // Implementar singleton para evitar múltiples instancias
    if (PrismaService.instance) {
      return PrismaService.instance;
    }

    const databaseUrl =
      process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

    super({
      log: ['warn', 'error'],
      ...(process.env.DATABASE_URL && {
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      }),
    });

    PrismaService.instance = this;
  }

  async onModuleInit() {
    if (this.isConnected) {
      this.logger.log('Database already connected, skipping...');
      return;
    }

    try {
      this.logger.log('Connecting to database...');
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }
}
