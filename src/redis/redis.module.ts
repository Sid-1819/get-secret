import { Global, Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [RedisService, RateLimitGuard],
  exports: [RedisService, RateLimitGuard],
})
export class RedisModule {}
