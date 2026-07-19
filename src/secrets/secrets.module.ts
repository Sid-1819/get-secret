import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';

@Module({
  controllers: [SecretsController],
  providers: [SecretsService],
  imports: [PrismaModule, MetricsModule],
})
export class SecretsModule {}
