import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

const secretReadTotalProvider = makeCounterProvider({
  name: 'secret_read_total',
  help: 'Total secret reads by source (redis cache or postgres)',
  labelNames: ['source'],
});

const secretCreateTotalProvider = makeCounterProvider({
  name: 'secret_create_total',
  help: 'Total secrets created',
});

const rateLimitChecksTotalProvider = makeCounterProvider({
  name: 'rate_limit_checks_total',
  help: 'Total rate limit checks performed by RateLimitGuard',
});

const redisProtectionsActiveProvider = makeGaugeProvider({
  name: 'redis_protections_active',
  help: '1 when Redis is connected (rate limits, wrong-password limits, cache active); 0 when disabled or degraded',
});

const rateLimitRejectedTotalProvider = makeCounterProvider({
  name: 'rate_limit_rejected_total',
  help: 'Total requests rejected by rate limit',
});

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
    }),
  ],
  providers: [
    secretReadTotalProvider,
    secretCreateTotalProvider,
    rateLimitChecksTotalProvider,
    rateLimitRejectedTotalProvider,
    redisProtectionsActiveProvider,
  ],
  exports: [
    PrometheusModule,
    secretReadTotalProvider,
    secretCreateTotalProvider,
    rateLimitChecksTotalProvider,
    rateLimitRejectedTotalProvider,
    redisProtectionsActiveProvider,
  ],
})
export class MetricsModule {}
