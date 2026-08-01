import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Gauge } from 'prom-client';
import Redis from 'ioredis';
import {
  RATE_LIMIT_KEY_PREFIX,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SEC,
  RATE_LIMIT_CLIENT_KEY_PREFIX,
  RATE_LIMIT_CREATE_MINUTE_WINDOW_SEC,
  RATE_LIMIT_CREATE_MINUTE_MAX,
  RATE_LIMIT_CREATE_DAILY_WINDOW_SEC,
  RATE_LIMIT_CREATE_DAILY_MAX,
  WRONG_PASSWORD_KEY_PREFIX,
  WRONG_PASSWORD_WINDOW_SEC,
  WRONG_PASSWORD_MAX_ATTEMPTS,
} from '../constants';

export type RedisMode = 'disabled' | 'connected' | 'degraded';

export type RedisStatusSnapshot = {
  configured: boolean;
  connected: boolean;
  protectionsActive: boolean;
  mode: RedisMode;
  lastError?: string;
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly configured: boolean;
  private mode: RedisMode = 'disabled';
  private lastError: string | undefined;

  constructor(
    @InjectMetric('redis_protections_active')
    private readonly redisProtectionsActive: Gauge<string>,
  ) {
    const url = process.env.REDIS_URL?.trim();
    this.configured = Boolean(url);
    if (this.configured) {
      this.client = new Redis(url!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) =>
          times <= 3 ? Math.min(times * 100, 3000) : null,
      });
      this.client.on('connect', () => {
        this.setConnected();
      });
      this.client.on('error', (err: Error) => {
        this.markDegraded(err.message);
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.configured) {
      this.mode = 'disabled';
      this.syncProtectionsMetric();
      this.logger.log(
        'REDIS_URL not set; rate limits and cache disabled; reads use Postgres',
      );
      return;
    }

    try {
      await this.client!.ping();
      this.setConnected();
      this.logger.log('Redis connected; rate limits and cache enabled');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.markDegraded(message);
      this.logger.warn(
        `Redis configured but unreachable on startup: ${message}; abuse protections disabled`,
      );
    }
  }

  /** @deprecated Prefer isConfigured — kept for existing cache gating. */
  get isEnabled(): boolean {
    return this.configured;
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  get isConnected(): boolean {
    return this.mode === 'connected';
  }

  get areProtectionsActive(): boolean {
    return this.mode === 'connected';
  }

  getStatus(): RedisStatusSnapshot {
    const snapshot: RedisStatusSnapshot = {
      configured: this.configured,
      connected: this.mode === 'connected',
      protectionsActive: this.areProtectionsActive,
      mode: this.mode,
    };
    if (this.lastError != null) {
      snapshot.lastError = this.lastError;
    }
    return snapshot;
  }

  private setConnected(): void {
    if (this.mode === 'connected') return;
    this.mode = 'connected';
    this.lastError = undefined;
    this.syncProtectionsMetric();
    if (this.configured) {
      this.logger.log('Redis connection restored; abuse protections active');
    }
  }

  private markDegraded(message: string): void {
    const previousMode = this.mode;
    this.mode = 'degraded';
    this.lastError = message;
    this.syncProtectionsMetric();
    if (previousMode !== 'degraded') {
      this.logger.warn(
        `Redis degraded: ${message}; abuse protections disabled until reconnected`,
      );
    }
  }

  private syncProtectionsMetric(): void {
    this.redisProtectionsActive.set(this.areProtectionsActive ? 1 : 0);
  }

  private handleOperationError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    if (this.mode !== 'degraded') {
      this.markDegraded(message);
    } else {
      this.lastError = message;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.handleOperationError(err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds != null && ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.handleOperationError(err);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.handleOperationError(err);
    }
  }

  /**
   * Returns true if the request is allowed (under limit), false if over limit.
   */
  async checkRateLimit(identifier: string): Promise<boolean> {
    if (!this.client) return true;
    const key = `${RATE_LIMIT_KEY_PREFIX}${identifier}`;
    try {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, RATE_LIMIT_WINDOW_SEC);
      }
      return count <= RATE_LIMIT_MAX_REQUESTS;
    } catch (err) {
      this.handleOperationError(err);
      return true;
    }
  }

  /**
   * Create-secret rate limit: 3 per minute and 10 per 24h per client (IP + user-agent hash).
   * Returns true if allowed, false if over either limit.
   */
  async checkCreateRateLimit(clientHash: string): Promise<boolean> {
    if (!this.client) return true;
    const keyMinute = `${RATE_LIMIT_CLIENT_KEY_PREFIX}${clientHash}:1m`;
    const keyDay = `${RATE_LIMIT_CLIENT_KEY_PREFIX}${clientHash}:24h`;
    try {
      const [countMinute, countDay] = await Promise.all([
        this.client.incr(keyMinute),
        this.client.incr(keyDay),
      ]);
      if (countMinute === 1)
        await this.client.expire(
          keyMinute,
          RATE_LIMIT_CREATE_MINUTE_WINDOW_SEC,
        );
      if (countDay === 1)
        await this.client.expire(keyDay, RATE_LIMIT_CREATE_DAILY_WINDOW_SEC);
      return (
        countMinute <= RATE_LIMIT_CREATE_MINUTE_MAX &&
        countDay <= RATE_LIMIT_CREATE_DAILY_MAX
      );
    } catch (err) {
      this.handleOperationError(err);
      return true;
    }
  }

  /**
   * Returns true if wrong-password attempts for this slug have exceeded the limit (should return 429).
   */
  async isWrongPasswordLimitExceeded(slug: string): Promise<boolean> {
    if (!this.client) return false;
    const key = `${WRONG_PASSWORD_KEY_PREFIX}${slug}`;
    try {
      const raw = await this.client.get(key);
      const count = raw ? parseInt(raw, 10) : 0;
      return count >= WRONG_PASSWORD_MAX_ATTEMPTS;
    } catch (err) {
      this.handleOperationError(err);
      return false;
    }
  }

  /**
   * Record a wrong password attempt for this slug. Call only when password verification failed.
   */
  async recordWrongPasswordAttempt(slug: string): Promise<void> {
    if (!this.client) return;
    const key = `${WRONG_PASSWORD_KEY_PREFIX}${slug}`;
    try {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, WRONG_PASSWORD_WINDOW_SEC);
      }
    } catch (err) {
      this.handleOperationError(err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
