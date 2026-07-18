import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import type { SecureNote } from '@prisma/client';
import { NotePayloadMode, Prisma } from '@prisma/client';
import { CACHE_KEY_PREFIX, CACHE_MAX_TTL_SEC } from '../constants';
import { EncryptionService } from '../encryption/encryption.service';
import { PasswordService } from '../password/password.service';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { CreateMultipartNoteDto } from './dto/create-multipart-note.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  assertAllowedMimeType,
  assertValidClientFileEnvelopeJson,
  assertValidClientNoteEnvelopeJson,
  ATTACHMENT_MAX_BYTES,
  sanitizeOriginalFileName,
} from './attachment.constants';

const SLUG_BYTES = 12;

function generateSlug(): string {
  return randomBytes(SLUG_BYTES).toString('base64url');
}

export type ReadNoteAttachment = {
  mimeType: string;
  originalName: string;
  /**
   * SERVER_ENCRYPTED: base64 of plaintext file bytes.
   * CLIENT_CIPHERTEXT: opaque UTF-8 JSON ciphertext envelope for the file.
   */
  data: string;
};

export type ReadNoteResult =
  | {
      success: true;
      payloadMode: NotePayloadMode;
      content: string;
      attachment: ReadNoteAttachment | null;
    }
  | {
      success: false;
      code: 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'WRONG_PASSWORD_LIMIT';
    }
  | null;

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly encryptionService: EncryptionService,
    private readonly passwordService: PasswordService,
    @InjectMetric('note_read_total')
    private readonly noteReadTotal: Counter<string>,
    @InjectMetric('note_create_total')
    private readonly noteCreateTotal: Counter<string>,
  ) {}

  /**
   * Find note by slug without incrementing view count. Returns null if not found or expired/deleted/over maxViews.
   */
  private async findNoteBySlug(slug: string): Promise<SecureNote | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${slug}`;
    if (this.redis.isEnabled) {
      const cached = await this.redis.get<SecureNote>(cacheKey);
      if (cached) return cached;
    }
    const note = await this.prisma.secureNote.findFirst({
      where: {
        slug,
        isDeleted: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!note) return null;
    if (note.maxViews != null && note.viewCount >= note.maxViews) return null;
    return note;
  }

  private async loadAttachmentForRead(
    noteId: string,
    payloadMode: NotePayloadMode,
  ): Promise<ReadNoteAttachment | null> {
    const row = await this.prisma.secureNoteAttachment.findFirst({
      where: { noteId },
    });
    if (!row) return null;
    if (payloadMode === NotePayloadMode.SERVER_ENCRYPTED) {
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

  async readBySlug(slug: string, password?: string): Promise<ReadNoteResult> {
    const note = await this.findNoteBySlug(slug);
    if (!note) return null;

    if (note.passwordHash) {
      if (password === undefined || password === '') {
        return { success: false, code: 'PASSWORD_REQUIRED' };
      }
      const limitExceeded = await this.redis.isWrongPasswordLimitExceeded(slug);
      if (limitExceeded) {
        return { success: false, code: 'WRONG_PASSWORD_LIMIT' };
      }
      const valid = await this.passwordService.compare(
        password,
        note.passwordHash,
      );
      if (!valid) {
        await this.redis.recordWrongPasswordAttempt(slug);
        return { success: false, code: 'INVALID_PASSWORD' };
      }
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${slug}`;

    const rows = await this.prisma.$queryRaw<SecureNote[]>`
      UPDATE "SecureNote"
      SET "viewCount" = "viewCount" + 1
      WHERE "slug" = ${slug}
        AND "isDeleted" = false
        AND ("expiresAt" IS NULL OR "expiresAt" > now())
        AND ("maxViews" IS NULL OR "viewCount" < "maxViews")
      RETURNING *
    `;
    const updated = rows[0] ?? null;
    if (!updated) return null;

    if (this.redis.isEnabled) {
      const ttl = this.getCacheTtl(updated);
      await this.redis.set(cacheKey, updated, ttl);
    }

    if (updated.maxViews != null && updated.viewCount >= updated.maxViews) {
      await this.prisma.secureNote.update({
        where: { id: updated.id },
        data: { isDeleted: true },
      });
      if (this.redis.isEnabled) await this.redis.del(cacheKey);
    }
    this.noteReadTotal.inc({ source: 'postgres' });
    const content =
      updated.payloadMode === NotePayloadMode.CLIENT_CIPHERTEXT
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

  private getCacheTtl(note: SecureNote): number {
    const maxTtl = CACHE_MAX_TTL_SEC;
    if (note.expiresAt == null) {
      return maxTtl;
    }
    const remainingSec = Math.floor(
      (note.expiresAt.getTime() - Date.now()) / 1000,
    );
    if (remainingSec <= 0) return 1;
    return Math.min(remainingSec, maxTtl);
  }

  async create(dto: CreateNoteDto): Promise<SecureNote> {
    return this.createUnified(dto, undefined);
  }

  async createMultipart(
    dto: CreateMultipartNoteDto,
    file?: Express.Multer.File,
  ): Promise<SecureNote> {
    return this.createUnified(dto, file);
  }

  private async createUnified(
    dto: CreateNoteDto | CreateMultipartNoteDto,
    file: Express.Multer.File | undefined,
  ): Promise<SecureNote> {
    const trimmedPassword = dto.password?.trim() ?? '';
    const hasPassword = trimmedPassword !== '';
    const mode = hasPassword
      ? NotePayloadMode.CLIENT_CIPHERTEXT
      : NotePayloadMode.SERVER_ENCRYPTED;

    let contentToStore: string;
    if (hasPassword) {
      const raw = dto.content.trim();
      assertValidClientNoteEnvelopeJson(raw);
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
      if (mode === NotePayloadMode.SERVER_ENCRYPTED) {
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
        const meta = dto as CreateMultipartNoteDto;
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
        const note = await this.prisma.$transaction(async (tx) => {
          const created = await tx.secureNote.create({
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
            await tx.secureNoteAttachment.create({
              data: {
                noteId: created.id,
                mimeType: attachmentInput.mimeType,
                originalName: attachmentInput.originalName,
                payload: attachmentInput.payload,
              },
            });
          }
          return created;
        });
        this.noteCreateTotal.inc();
        return note;
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
