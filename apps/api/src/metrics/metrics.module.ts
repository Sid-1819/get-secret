import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
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
  help: 'Total rate limit checks (every request hits Redis for rate limiting)',
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
  ],
  exports: [
    PrometheusModule,
    secretReadTotalProvider,
    secretCreateTotalProvider,
    rateLimitChecksTotalProvider,
    rateLimitRejectedTotalProvider,
  ],
})
export class MetricsModule {}
