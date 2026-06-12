import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = Number(this.configService.get<string>('REDIS_PORT') ?? 6379);

    this.client = new Redis({
      host,
      port,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.warn(`Redis connect failed: ${this.message(error)}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(
        `Redis get failed for key "${key}": ${this.message(error)}`,
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Redis set failed for key "${key}": ${this.message(error)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(
        `Redis del failed for key "${key}": ${this.message(error)}`,
      );
    }
  }

  onModuleDestroy(): void {
    try {
      this.client.disconnect();
    } catch (error) {
      this.logger.warn(`Redis disconnect failed: ${this.message(error)}`);
    }
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
