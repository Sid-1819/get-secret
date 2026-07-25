import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import type { SecureSecret } from '@prisma/client';
import { Prisma, SecretPayloadMode } from '@prisma/client';
import { CACHE_KEY_PREFIX, CACHE_MAX_TTL_SEC } from '../constants';
import { EncryptionService } from '../encryption/encryption.service';
import { PasswordService } from '../password/password.service';
import type { CreateSecretDto } from './dto/create-secret.dto';
import type { CreateMultipartSecretDto } from './dto/create-multipart-secret.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  assertAllowedMimeType,
  assertValidClientFileEnvelopeJson,
  assertValidClientSecretEnvelopeJson,
  ATTACHMENT_MAX_BYTES,
  sanitizeOriginalFileName,
} from './attachment.constants';

const SLUG_BYTES = 12;

/** Fields used from multer memory uploads (`FileInterceptor` default storage). */
type UploadedSecretFile = {
  mimetype: string;
  buffer: Buffer;
  originalname: string;
};

function generateSlug(): string {
  return randomBytes(SLUG_BYTES).toString('base64url');
}

export type ReadSecretAttachment = {
  mimeType: string;
  originalName: string;
  /**
   * SERVER_ENCRYPTED: base64 of plaintext file bytes.
   * CLIENT_CIPHERTEXT: opaque UTF-8 JSON ciphertext envelope for the file.
   */
  data: string;
};

export type ReadSecretResult =
  | {
      success: true;
      payloadMode: SecretPayloadMode;
      content: string;
      attachment: ReadSecretAttachment | null;
    }
  | {
      success: false;
      code: 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'WRONG_PASSWORD_LIMIT';
    }
  | null;

@Injectable()
export class SecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordService: PasswordService,
    @InjectMetric('secret_read_total')
    private readonly secretReadTotal: Counter<string>,
    @InjectMetric('secret_create_total')
    private readonly secretCreateTotal: Counter<string>,
  ) {}

  private isSecretEligible(secret: SecureSecret): boolean {
    if (secret.isDeleted) return false;
    const expiresAt =
      secret.expiresAt == null
        ? null
        : secret.expiresAt instanceof Date
          ? secret.expiresAt
          : new Date(secret.expiresAt);
    if (expiresAt != null && expiresAt <= new Date()) return false;
    if (secret.maxViews != null && secret.viewCount >= secret.maxViews)
      return false;
    return true;
  }

  /**
   * Find secret by slug without incrementing view count. Returns null if not found or expired/deleted/over maxViews.
   * Always confirms live DB state; cache is used only to detect and purge stale entries.
   */
  private async findSecretBySlug(slug: string): Promise<SecureSecret | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${slug}`;
    if (this.redis.isEnabled) {
      const cached = await this.redis.get<SecureSecret>(cacheKey);
      if (cached && !this.isSecretEligible(cached)) {
        await this.redis.del(cacheKey);
      }
    }
    const secret = await this.prisma.secureSecret.findFirst({
      where: {
        slug,
        isDeleted: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!secret || !this.isSecretEligible(secret)) return null;
    return secret;
  }

  private async loadAttachmentForRead(
    secretId: string,
    payloadMode: SecretPayloadMode,
  ): Promise<ReadSecretAttachment | null> {
    const row = await this.prisma.secureSecretAttachment.findFirst({
      where: { secretId },
    });
    if (!row) return null;
    if (payloadMode === SecretPayloadMode.SERVER_ENCRYPTED) {
      const bytes = this.encryptionService.decryptToBytes(row.payload);
      return {
        mimeType: row.mimeType,
        originalName: row.originalName,
        data: bytes.toString('base64'),
      };
    }
    return {
      mimeType: row.mimeType,
      originalName: row.originalName,
      data: row.payload,
    };
  }

  async readBySlug(slug: string, password?: string): Promise<ReadSecretResult> {
    const secret = await this.findSecretBySlug(slug);
    if (!secret) return null;

    if (secret.passwordHash) {
      if (password === undefined || password === '') {
        return { success: false, code: 'PASSWORD_REQUIRED' };
      }
      const limitExceeded = await this.redis.isWrongPasswordLimitExceeded(slug);
      if (limitExceeded) {
        return { success: false, code: 'WRONG_PASSWORD_LIMIT' };
      }
      const valid = await this.passwordService.compare(
        password,
        secret.passwordHash,
      );
      if (!valid) {
        await this.redis.recordWrongPasswordAttempt(slug);
        return { success: false, code: 'INVALID_PASSWORD' };
      }
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${slug}`;

    const rows = await this.prisma.$queryRaw<SecureSecret[]>`
      UPDATE "SecureSecret"
      SET "viewCount" = "viewCount" + 1,
          "isDeleted" = CASE
            WHEN "maxViews" IS NOT NULL AND "viewCount" + 1 >= "maxViews" THEN true
            ELSE "isDeleted"
          END
      WHERE "slug" = ${slug}
        AND "isDeleted" = false
        AND ("expiresAt" IS NULL OR "expiresAt" > now())
        AND ("maxViews" IS NULL OR "viewCount" < "maxViews")
      RETURNING *
    `;
    const updated = rows[0] ?? null;
    if (!updated) return null;

    if (this.redis.isEnabled) {
      if (updated.isDeleted) {
        await this.redis.del(cacheKey);
      } else {
        const ttl = this.getCacheTtl(updated);
        await this.redis.set(cacheKey, updated, ttl);
      }
    }
    this.secretReadTotal.inc({ source: 'postgres' });
    const content =
      updated.payloadMode === SecretPayloadMode.CLIENT_CIPHERTEXT
        ? updated.content
        : this.encryptionService.decrypt(updated.content);
    const attachment = updated.hasAttachments
      ? await this.loadAttachmentForRead(updated.id, updated.payloadMode)
      : null;
    return {
      success: true,
      payloadMode: updated.payloadMode,
      content,
      attachment,
    };
  }

  private getCacheTtl(secret: SecureSecret): number {
    const maxTtl = CACHE_MAX_TTL_SEC;
    if (secret.expiresAt == null) {
      return maxTtl;
    }
    const remainingSec = Math.floor(
      (secret.expiresAt.getTime() - Date.now()) / 1000,
    );
    if (remainingSec <= 0) return 1;
    return Math.min(remainingSec, maxTtl);
  }

  async create(dto: CreateSecretDto): Promise<SecureSecret> {
    return this.createUnified(dto, undefined);
  }

  async createMultipart(
    dto: CreateMultipartSecretDto,
    file?: UploadedSecretFile,
  ): Promise<SecureSecret> {
    return this.createUnified(dto, file);
  }

  private async createUnified(
    dto: CreateSecretDto | CreateMultipartSecretDto,
    file: UploadedSecretFile | undefined,
  ): Promise<SecureSecret> {
    const trimmedPassword = dto.password?.trim() ?? '';
    const hasPassword = trimmedPassword !== '';
    const mode = hasPassword
      ? SecretPayloadMode.CLIENT_CIPHERTEXT
      : SecretPayloadMode.SERVER_ENCRYPTED;

    let contentToStore: string;
    if (hasPassword) {
      const raw = dto.content.trim();
      assertValidClientSecretEnvelopeJson(raw);
      contentToStore = raw;
    } else {
      contentToStore = this.encryptionService.encrypt(dto.content);
    }

    let hasAttachments = false;
    let attachmentInput: {
      mimeType: string;
      originalName: string;
      payload: string;
    } | null = null;

    if (file) {
      hasAttachments = true;
      if (mode === SecretPayloadMode.SERVER_ENCRYPTED) {
        assertAllowedMimeType(file.mimetype);
        if (
          !Buffer.isBuffer(file.buffer) ||
          file.buffer.length > ATTACHMENT_MAX_BYTES
        ) {
          throw new BadRequestException({
            message: `File must be at most ${ATTACHMENT_MAX_BYTES} bytes`,
            code: 'FILE_TOO_LARGE',
          });
        }
        attachmentInput = {
          mimeType: file.mimetype.split(';')[0]?.trim().toLowerCase() ?? '',
          originalName: sanitizeOriginalFileName(file.originalname),
          payload: this.encryptionService.encryptBytes(file.buffer),
        };
      } else {
        const meta = dto as CreateMultipartSecretDto;
        if (!meta.attachmentMimeType || !meta.attachmentFileName) {
          throw new BadRequestException({
            message:
              'attachmentMimeType and attachmentFileName are required when uploading a file with a passphrase',
            code: 'ATTACHMENT_META_REQUIRED',
          });
        }
        assertAllowedMimeType(meta.attachmentMimeType);
        const utf8 = file.buffer.toString('utf8');
        if (Buffer.byteLength(utf8, 'utf8') > ATTACHMENT_MAX_BYTES) {
          throw new BadRequestException({
            message: `File ciphertext must be at most ${ATTACHMENT_MAX_BYTES} bytes`,
            code: 'FILE_TOO_LARGE',
          });
        }
        assertValidClientFileEnvelopeJson(utf8);
        attachmentInput = {
          mimeType:
            meta.attachmentMimeType.split(';')[0]?.trim().toLowerCase() ?? '',
          originalName: sanitizeOriginalFileName(meta.attachmentFileName),
          payload: utf8,
        };
      }
    }

    const passwordHash = hasPassword
      ? await this.passwordService.hash(trimmedPassword)
      : undefined;

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    const maxViews = dto.maxViews ?? undefined;

    for (let attempt = 0; attempt < 8; attempt++) {
      const slug = generateSlug();
      try {
        const secret = await this.prisma.$transaction(async (tx) => {
          const created = await tx.secureSecret.create({
            data: {
              slug,
              content: contentToStore,
              payloadMode: mode,
              hasAttachments,
              passwordHash: passwordHash ?? undefined,
              expiresAt,
              maxViews,
            },
          });
          if (attachmentInput) {
            await tx.secureSecretAttachment.create({
              data: {
                secretId: created.id,
                mimeType: attachmentInput.mimeType,
                originalName: attachmentInput.originalName,
                payload: attachmentInput.payload,
              },
            });
          }
          return created;
        });
        this.secretCreateTotal.inc();
        return secret;
      } catch (err) {
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002';
        if (!isUniqueViolation) throw err;
      }
    }
    throw new Error('Could not allocate unique slug');
  }
}
