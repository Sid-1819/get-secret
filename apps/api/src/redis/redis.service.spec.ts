import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis');

function makeGauge() {
  return { set: jest.fn() };
}

describe('RedisService', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  const gauge = makeGauge();

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
    jest.clearAllMocks();
  });

  it('reports disabled status and allows rate limits when REDIS_URL is unset', async () => {
    delete process.env.REDIS_URL;
    const service = new RedisService(gauge as never);
    await service.onModuleInit();

    expect(service.getStatus()).toEqual({
      configured: false,
      connected: false,
      protectionsActive: false,
      mode: 'disabled',
    });
    expect(service.areProtectionsActive).toBe(false);
    await expect(service.checkRateLimit('127.0.0.1')).resolves.toBe(true);
    expect(gauge.set).toHaveBeenCalledWith(0);
  });

  it('marks degraded when startup ping fails', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6399';
    const ping = jest.fn().mockRejectedValue(new Error('connection refused'));
    const on = jest.fn();
    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      on,
      ping,
      quit: jest.fn(),
    }));

    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const service = new RedisService(gauge as never);
    await service.onModuleInit();

    expect(service.getStatus().mode).toBe('degraded');
    expect(service.areProtectionsActive).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('marks connected when startup ping succeeds', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    const ping = jest.fn().mockResolvedValue('PONG');
    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      on: jest.fn(),
      ping,
      quit: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    }));

    const service = new RedisService(gauge as never);
    await service.onModuleInit();

    expect(service.getStatus().mode).toBe('connected');
    expect(service.areProtectionsActive).toBe(true);
    expect(gauge.set).toHaveBeenCalledWith(1);
  });

  it('transitions to degraded on operation failure', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    const ping = jest.fn().mockResolvedValue('PONG');
    const incr = jest.fn().mockRejectedValue(new Error('broken pipe'));
    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      on: jest.fn(),
      ping,
      quit: jest.fn(),
      incr,
      expire: jest.fn(),
    }));

    const service = new RedisService(gauge as never);
    await service.onModuleInit();
    await expect(service.checkRateLimit('127.0.0.1')).resolves.toBe(true);

    expect(service.getStatus().mode).toBe('degraded');
    expect(service.getStatus().lastError).toBe('broken pipe');
  });
});
