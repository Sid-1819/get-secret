import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  ForbiddenException,
  NotFoundException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSecretDto } from './dto/create-secret.dto';
import { CreateMultipartSecretDto } from './dto/create-multipart-secret.dto';
import { RateLimitGuard } from '../redis/rate-limit.guard';
import { SecretsService } from './secrets.service';
import { MULTIPART_FILE_FIELD_MAX_BYTES } from './attachment.constants';

const SECRET_PASSWORD_HEADER = 'x-secret-password';

function getPublicAppUrl(): string {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;
  return process.env.NODE_ENV === 'production'
    ? 'https://getsecret.visionly.dev'
    : 'http://localhost:8080';
}
const PUBLIC_APP_URL = getPublicAppUrl();

@Controller('s')
@UseGuards(RateLimitGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSecret(@Body() dto: CreateSecretDto) {
    const secret = await this.secretsService.create(dto);
    const url = `${PUBLIC_APP_URL.replace(/\/$/, '')}/s/${secret.slug}`;
    return {
      slug: secret.slug,
      url,
      expiresAt: secret.expiresAt?.toISOString() ?? null,
      maxViews: secret.maxViews ?? null,
    };
  }

  @Post('multipart')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MULTIPART_FILE_FIELD_MAX_BYTES },
    }),
  )
  async createSecretMultipart(
    @Body() dto: CreateMultipartSecretDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const secret = await this.secretsService.createMultipart(dto, file);
    const url = `${PUBLIC_APP_URL.replace(/\/$/, '')}/s/${secret.slug}`;
    return {
      slug: secret.slug,
      url,
      expiresAt: secret.expiresAt?.toISOString() ?? null,
      maxViews: secret.maxViews ?? null,
    };
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  async readSecret(
    @Param('slug') slug: string,
    @Headers(SECRET_PASSWORD_HEADER) password?: string,
  ) {
    const result = await this.secretsService.readBySlug(
      slug,
      password?.trim() || undefined,
    );

    if (result === null) {
      throw new NotFoundException();
    }

    if (!result.success) {
      if (result.code === 'WRONG_PASSWORD_LIMIT') {
        throw new HttpException(
          {
            code: result.code,
            message:
              'Too many wrong passphrase attempts. Try again in 15 minutes.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new ForbiddenException({
        code: result.code,
        message:
          result.code === 'PASSWORD_REQUIRED'
            ? 'This secret is protected. Provide the passphrase in the X-Secret-Password header.'
            : 'Invalid passphrase.',
      });
    }

    return {
      payloadMode: result.payloadMode,
      content: result.content,
      attachment: result.attachment,
    };
  }
}
