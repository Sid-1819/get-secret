import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  createCorsOriginCallback,
  parseCorsOrigins,
} from './cors.config';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: createCorsOriginCallback(corsOrigins),
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Secret-Password'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const redis = app.get(RedisService);
  const bootstrapLogger = new Logger('Bootstrap');
  if (redis.areProtectionsActive) {
    bootstrapLogger.log('Redis protections active');
  } else if (redis.isConfigured) {
    bootstrapLogger.warn(
      'Redis configured but protections inactive (degraded)',
    );
  } else {
    bootstrapLogger.log(
      'Redis not configured — running Postgres-only (no rate limits)',
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
