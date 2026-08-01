import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  const redisStatus = {
    configured: false,
    connected: false,
    protectionsActive: false,
    mode: 'disabled' as const,
  };

  it('returns ok when postgres is reachable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const redis = {
      getStatus: jest.fn().mockReturnValue(redisStatus),
    } as unknown as RedisService;
    const controller = new HealthController(prisma, redis);

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      postgres: 'ok',
      redis: redisStatus,
    });
  });

  it('throws 503 when postgres is unreachable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaService;
    const redis = {
      getStatus: jest.fn().mockReturnValue(redisStatus),
    } as unknown as RedisService;
    const controller = new HealthController(prisma, redis);

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('includes degraded redis state without failing health', async () => {
    const degradedRedis = {
      configured: true,
      connected: false,
      protectionsActive: false,
      mode: 'degraded' as const,
      lastError: 'connection refused',
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const redis = {
      getStatus: jest.fn().mockReturnValue(degradedRedis),
    } as unknown as RedisService;
    const controller = new HealthController(prisma, redis);

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      postgres: 'ok',
      redis: degradedRedis,
    });
  });
});
