import { NotePayloadMode, Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption/encryption.service';
import { PasswordService } from '../password/password.service';

jest.mock('../password/password.service', () => ({
  PasswordService: jest.fn().mockImplementation(() => ({
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  })),
}));
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { getToken } from '@willsoto/nestjs-prometheus';
import { NotesService } from './notes.service';
import type { CreateNoteDto } from './dto/create-note.dto';

type SecureNoteCreateArgs = {
  data: Record<string, unknown>;
};

function makeClientNoteEnvelope(): string {
  return JSON.stringify({
    v: 1,
    salt: Buffer.alloc(16, 1).toString('base64'),
    note: {
      iv: Buffer.alloc(12, 2).toString('base64'),
      c: Buffer.alloc(16, 3).toString('base64'),
      t: Buffer.alloc(16, 4).toString('base64'),
    },
  });
}

describe('NotesService', () => {
  let service: NotesService;
  let prisma: PrismaService;
  let encryptionService: EncryptionService;

  const secureNoteCreate = jest.fn();
  const prismaServiceMock = {
    secureNote: {
      create: secureNoteCreate,
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    secureNoteAttachment: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        secureNote: { create: secureNoteCreate },
        secureNoteAttachment: {
          create: jest.fn().mockResolvedValue({ id: 'att-1' }),
        },
      };
      return fn(tx);
    }),
  };

  const mockRedis = {
    isEnabled: false,
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    checkRateLimit: jest.fn(),
    isWrongPasswordLimitExceeded: jest.fn().mockResolvedValue(false),
    recordWrongPasswordAttempt: jest.fn(),
  };

  const mockPasswordService = {
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  };

  const mockNoteReadTotal = { inc: jest.fn() };
  const mockNoteCreateTotal = { inc: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.isEnabled = false;
    mockRedis.isWrongPasswordLimitExceeded.mockResolvedValue(false);
    mockRedis.recordWrongPasswordAttempt.mockResolvedValue(undefined);
    mockPasswordService.compare.mockResolvedValue(true);
    mockPasswordService.hash.mockResolvedValue('hashedpassword');
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    secureNoteCreate.mockReset();
    prismaServiceMock.secureNoteAttachment.findFirst.mockReset();
    prismaServiceMock.secureNoteAttachment.findFirst.mockResolvedValue(null);
    (prismaServiceMock.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          secureNote: { create: secureNoteCreate },
          secureNoteAttachment: {
            create: jest.fn().mockResolvedValue({ id: 'att-1' }),
          },
        };
        return fn(tx);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        EncryptionService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        { provide: RedisService, useValue: mockRedis },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: getToken('note_read_total'), useValue: mockNoteReadTotal },
        {
          provide: getToken('note_create_total'),
          useValue: mockNoteCreateTotal,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    prisma = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('create', () => {
    const dto: CreateNoteDto = {
      content: 'secret message',
    };

    const createdNote = {
      id: 'id-1',
      slug: 'abc123base64url',
      content: '', // set by mock from encrypted payload
      payloadMode: NotePayloadMode.SERVER_ENCRYPTED,
      hasAttachments: false,
      passwordHash: null,
      expiresAt: null,
      lastViewedAt: null,
      maxViews: null,
      viewCount: 0,
      isDeleted: false,
      createdAt: new Date(),
      createdBy: null,
      userId: null,
    };

    it('creates a note with encrypted content and returns it with a generated slug', async () => {
      secureNoteCreate.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdNote, ...data, content: data.content }),
      );

      const result = await service.create(dto);

      const createMock = secureNoteCreate as jest.Mock<
        Promise<unknown>,
        [SecureNoteCreateArgs]
      >;
      expect(createMock).toHaveBeenCalledTimes(1);
      const call = createMock.mock.calls[0][0];
      expect(call.data.content).not.toBe(dto.content);
      expect(call.data.content).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encryptionService.decrypt(result.content)).toBe(dto.content);
      expect(call.data.slug).toBeDefined();
      expect(call.data.payloadMode).toBe(NotePayloadMode.SERVER_ENCRYPTED);
      expect(call.data.hasAttachments).toBe(false);
      expect(call.data.passwordHash).toBeUndefined();
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
      expect(typeof call.data.slug).toBe('string');
      expect((call.data.slug as string).length).toBeGreaterThan(0);
      expect(call.data.expiresAt).toBeUndefined();
      expect(call.data.maxViews).toBeUndefined();
      expect(mockNoteCreateTotal.inc).toHaveBeenCalledTimes(1);
    });

    it('hashes and stores password when provided (client ciphertext)', async () => {
      const envelope = makeClientNoteEnvelope();
      const dtoWithPassword: CreateNoteDto = {
        content: envelope,
        password: 'MyPass1!',
      };
      secureNoteCreate.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdNote, ...data, content: data.content }),
      );

      await service.create(dtoWithPassword);

      expect(mockPasswordService.hash).toHaveBeenCalledWith('MyPass1!');
      const createMock = secureNoteCreate as jest.Mock<
        Promise<unknown>,
        [SecureNoteCreateArgs]
      >;
      const call = createMock.mock.calls[0][0];
      expect(call.data.passwordHash).toBe('hashedpassword');
      expect(call.data.content).toBe(envelope);
      expect(call.data.payloadMode).toBe(NotePayloadMode.CLIENT_CIPHERTEXT);
    });

    it('passes expiresAt and maxViews when provided', async () => {
      const dtoWithOpts: CreateNoteDto = {
        content: 'content',
        expiresAt: '2030-01-01T00:00:00.000Z',
        maxViews: 5,
      };
      secureNoteCreate.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdNote, ...data, content: data.content }),
      );

      await service.create(dtoWithOpts);

      const createMock = secureNoteCreate as jest.Mock<
        Promise<unknown>,
        [SecureNoteCreateArgs]
      >;
      const call = createMock.mock.calls[0][0];
      expect(call.data.expiresAt).toEqual(new Date(dtoWithOpts.expiresAt!));
      expect(call.data.maxViews).toBe(5);
      expect(call.data.content).not.toBe(dtoWithOpts.content);
    });

    it('retries with new slug on unique constraint violation (P2002)', async () => {
      const err = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: 'x',
        },
      );
      secureNoteCreate
        .mockRejectedValueOnce(err)
        .mockImplementationOnce(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdNote, ...data, content: data.content }),
        );

      const result = await service.create(dto);

      expect(encryptionService.decrypt(result.content)).toBe(dto.content);
      const createMock = secureNoteCreate as jest.Mock<
        Promise<unknown>,
        [SecureNoteCreateArgs]
      >;
      expect(createMock).toHaveBeenCalledTimes(2);
      expect(mockNoteCreateTotal.inc).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-P2002 errors', async () => {
      const err = new Error('DB connection failed');
      secureNoteCreate.mockRejectedValue(err);

      await expect(service.create(dto)).rejects.toThrow('DB connection failed');
      const createMock = secureNoteCreate as jest.Mock<
        Promise<unknown>,
        [SecureNoteCreateArgs]
      >;
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(mockNoteCreateTotal.inc).not.toHaveBeenCalled();
    });
  });

  describe('readBySlug', () => {
    it('returns note with decrypted content when read from DB', async () => {
      const plainContent = 'secret from db';
      const encryptedContent = encryptionService.encrypt(plainContent);
      const dbNote = {
        id: 'id-1',
        slug: 'the-slug',
        content: encryptedContent,
        payloadMode: NotePayloadMode.SERVER_ENCRYPTED,
        hasAttachments: false,
        passwordHash: null,
        expiresAt: null,
        lastViewedAt: null,
        maxViews: null,
        viewCount: 0,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      (prisma.secureNote.findFirst as jest.Mock).mockResolvedValue(dbNote);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...dbNote, viewCount: 1 },
      ]);

      const result = await service.readBySlug('the-slug');

      expect(result).not.toBeNull();
      expect(result).toEqual({
        success: true,
        content: plainContent,
        payloadMode: NotePayloadMode.SERVER_ENCRYPTED,
        attachment: null,
      });
      expect(mockNoteReadTotal.inc).toHaveBeenCalledWith({
        source: 'postgres',
      });
    });

    it('returns note after atomic increment even when metadata is from Redis cache', async () => {
      const plainContent = 'secret from cache';
      const encryptedContent = encryptionService.encrypt(plainContent);
      const cachedNote = {
        id: 'id-1',
        slug: 'cached-slug',
        content: encryptedContent,
        payloadMode: NotePayloadMode.SERVER_ENCRYPTED,
        hasAttachments: false,
        passwordHash: null,
        expiresAt: null,
        lastViewedAt: null,
        maxViews: 2,
        viewCount: 1,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      mockRedis.isEnabled = true;
      mockRedis.get.mockResolvedValue(cachedNote);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...cachedNote, viewCount: 2 },
      ]);

      const result = await service.readBySlug('cached-slug');

      expect(result).not.toBeNull();
      expect(result).toEqual({
        success: true,
        content: plainContent,
        payloadMode: NotePayloadMode.SERVER_ENCRYPTED,
        attachment: null,
      });
      expect(mockNoteReadTotal.inc).toHaveBeenCalledWith({
        source: 'postgres',
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('returns null when atomic increment fails despite stale Redis cache', async () => {
      const encryptedContent = encryptionService.encrypt('burned');
      const cachedNote = {
        id: 'id-1',
        slug: 'burned-slug',
        content: encryptedContent,
        payloadMode: NotePayloadMode.SERVER_ENCRYPTED,
        hasAttachments: false,
        passwordHash: null,
        expiresAt: null,
        lastViewedAt: null,
        maxViews: 1,
        viewCount: 0,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      mockRedis.isEnabled = true;
      mockRedis.get.mockResolvedValue(cachedNote);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.readBySlug('burned-slug');

      expect(result).toBeNull();
      expect(mockNoteReadTotal.inc).not.toHaveBeenCalled();
    });

    it('returns PASSWORD_REQUIRED when note has password and none provided', async () => {
      const clientContent = makeClientNoteEnvelope();
      const dbNote = {
        id: 'id-1',
        slug: 'protected-slug',
        content: clientContent,
        payloadMode: NotePayloadMode.CLIENT_CIPHERTEXT,
        hasAttachments: false,
        passwordHash: 'hashed',
        expiresAt: null,
        lastViewedAt: null,
        maxViews: null,
        viewCount: 0,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      (prisma.secureNote.findFirst as jest.Mock).mockResolvedValue(dbNote);

      const result = await service.readBySlug('protected-slug');

      expect(result).toEqual({ success: false, code: 'PASSWORD_REQUIRED' });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      const rawMock = prisma.$queryRaw as jest.Mock;
      expect(rawMock).not.toHaveBeenCalled();
    });

    it('returns INVALID_PASSWORD when password is wrong', async () => {
      const clientContent = makeClientNoteEnvelope();
      const dbNote = {
        id: 'id-1',
        slug: 'protected-slug',
        content: clientContent,
        payloadMode: NotePayloadMode.CLIENT_CIPHERTEXT,
        hasAttachments: false,
        passwordHash: 'hashed',
        expiresAt: null,
        lastViewedAt: null,
        maxViews: null,
        viewCount: 0,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      (prisma.secureNote.findFirst as jest.Mock).mockResolvedValue(dbNote);
      mockPasswordService.compare.mockResolvedValueOnce(false);

      const result = await service.readBySlug('protected-slug', 'wrong');

      expect(result).toEqual({ success: false, code: 'INVALID_PASSWORD' });
      expect(mockRedis.recordWrongPasswordAttempt).toHaveBeenCalledWith(
        'protected-slug',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      const rawMock = prisma.$queryRaw as jest.Mock;
      expect(rawMock).not.toHaveBeenCalled();
    });

    it('returns opaque content when password is correct (client ciphertext)', async () => {
      const clientContent = makeClientNoteEnvelope();
      const dbNote = {
        id: 'id-1',
        slug: 'protected-slug',
        content: clientContent,
        payloadMode: NotePayloadMode.CLIENT_CIPHERTEXT,
        hasAttachments: false,
        passwordHash: 'hashed',
        expiresAt: null,
        lastViewedAt: null,
        maxViews: null,
        viewCount: 0,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      (prisma.secureNote.findFirst as jest.Mock).mockResolvedValue(dbNote);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...dbNote, viewCount: 1 },
      ]);

      const result = await service.readBySlug('protected-slug', 'correct');

      expect(result).toEqual({
        success: true,
        content: clientContent,
        payloadMode: NotePayloadMode.CLIENT_CIPHERTEXT,
        attachment: null,
      });
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        'correct',
        'hashed',
      );
    });
  });
});
