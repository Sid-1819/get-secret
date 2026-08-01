import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

type HealthResponse = {
  status: 'ok' | 'degraded';
  postgres: 'ok' | 'error';
  redis: ReturnType<RedisService['getStatus']>;
};

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthResponse> {
    const postgres = await this.checkPostgres();
    const redis = this.redis.getStatus();

    if (postgres === 'error') {
      throw new ServiceUnavailableException({
        status: 'degraded',
        postgres,
        redis,
      });
    }

    return {
      status: 'ok',
      postgres,
      redis,
    };
  }

  private async checkPostgres(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
