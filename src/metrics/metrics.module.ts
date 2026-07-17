import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';

const noteReadTotalProvider = makeCounterProvider({
  name: 'note_read_total',
  help: 'Total note reads by source (redis cache or postgres)',
  labelNames: ['source'],
});

const noteCreateTotalProvider = makeCounterProvider({
  name: 'note_create_total',
  help: 'Total notes created',
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
    noteReadTotalProvider,
    noteCreateTotalProvider,
    rateLimitChecksTotalProvider,
    rateLimitRejectedTotalProvider,
  ],
  exports: [
    PrometheusModule,
    noteReadTotalProvider,
    noteCreateTotalProvider,
    rateLimitChecksTotalProvider,
    rateLimitRejectedTotalProvider,
  ],
})
export class MetricsModule {}
