import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from './redis.service';

function mockContext(method: string, path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        headers: {},
        ip: '127.0.0.1',
      }),
    }),
  } as ExecutionContext;
}

describe('RateLimitGuard', () => {
  const checkCreateRateLimit = jest.fn().mockResolvedValue(true);
  const checkRateLimit = jest.fn().mockResolvedValue(true);
  const rateLimitChecksTotal = { inc: jest.fn() };
  const rateLimitRejectedTotal = { inc: jest.fn() };

  const guard = new RateLimitGuard(
    {
      checkCreateRateLimit,
      checkRateLimit,
    } as unknown as RedisService,
    rateLimitChecksTotal as never,
    rateLimitRejectedTotal as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    checkCreateRateLimit.mockResolvedValue(true);
    checkRateLimit.mockResolvedValue(true);
  });

  it.each([
    ['POST', '/s'],
    ['POST', '/s/multipart'],
  ])('uses create rate limit for %s %s', async (method, path) => {
    await expect(guard.canActivate(mockContext(method, path))).resolves.toBe(
      true,
    );
    expect(checkCreateRateLimit).toHaveBeenCalledTimes(1);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('uses read rate limit for GET /s/:slug', async () => {
    await expect(
      guard.canActivate(mockContext('GET', '/s/abc123')),
    ).resolves.toBe(true);
    expect(checkRateLimit).toHaveBeenCalledTimes(1);
    expect(checkCreateRateLimit).not.toHaveBeenCalled();
  });

  it('returns create-specific 429 message for POST /s/multipart', async () => {
    checkCreateRateLimit.mockResolvedValue(false);

    let caught: unknown;
    try {
      await guard.canActivate(mockContext('POST', '/s/multipart'));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpException);
    const response = (caught as HttpException).getResponse() as {
      message?: string;
    };
    expect(response.message).toMatch(/Too many notes created/i);
  });

  it('returns generic 429 message for GET over read limit', async () => {
    checkRateLimit.mockResolvedValue(false);

    let caught: unknown;
    try {
      await guard.canActivate(mockContext('GET', '/s/abc123'));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpException);
    const response = (caught as HttpException).getResponse() as {
      message?: string;
    };
    expect(response.message).toBe('Too many requests');
  });
});
