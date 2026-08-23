import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { EncryptionModule } from './encryption/encryption.module';
import { MetricsModule } from './metrics/metrics.module';
import { SecretsModule } from './secrets/secrets.module';
import { PasswordModule } from './password/password.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    EncryptionModule,
    MetricsModule,
    PasswordModule,
    PrismaModule,
    RedisModule,
    SecretsModule,
    HealthModule,
  ],
  controllers: [AppController],
  
})
export class AppModule {}
