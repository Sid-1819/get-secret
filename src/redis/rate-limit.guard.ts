import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Request } from 'express';
import type { Counter } from 'prom-client';
import { RedisService } from './redis.service';

function getClientHash(request: Request): string {
  const ip =
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    request.ip ??
    request.socket?.remoteAddress ??
    'unknown';
  const ua = request.headers['user-agent'] ?? '';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
}

function getIp(request: Request): string {
  return (
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    request.ip ??
    request.socket?.remoteAddress ??
    'unknown'
  );
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly redis: RedisService,
    @InjectMetric('rate_limit_checks_total')
    private readonly rateLimitChecksTotal: Counter,
    @InjectMetric('rate_limit_rejected_total')
    private readonly rateLimitRejectedTotal: Counter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const isCreate = request.method === 'POST' && request.path === '/s';

    this.rateLimitChecksTotal.inc();
    const allowed = isCreate
      ? await this.redis.checkCreateRateLimit(getClientHash(request))
      : await this.redis.checkRateLimit(getIp(request));

    if (!allowed) {
      this.rateLimitRejectedTotal.inc();
      const clientHash = getClientHash(request);
      this.logger.warn(
        `Rate limit exceeded (429) path=${request.path} method=${request.method} client=${clientHash.slice(0, 8)}...`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: isCreate
            ? 'Too many notes created. Limit: 3 per minute, 10 per 24 hours. Try again later.'
            : 'Too many requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
