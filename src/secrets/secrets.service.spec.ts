import { SecretPayloadMode, Prisma } from '@prisma/client';
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
import { SecretsService } from './secrets.service';
import type { CreateSecretDto } from './dto/create-secret.dto';

type SecureSecretCreateArgs = {
  data: Record<string, unknown>;
};

function makeClientSecretEnvelope(): string {
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

describe('SecretsService', () => {
  let service: SecretsService;
  let prisma: PrismaService;
  let encryptionService: EncryptionService;

  const secureSecretCreate = jest.fn();
  const prismaServiceMock = {
    secureSecret: {
      create: secureSecretCreate,
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    secureSecretAttachment: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        secureSecret: { create: secureSecretCreate },
        secureSecretAttachment: {
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

  const mockSecretReadTotal = { inc: jest.fn() };
  const mockSecretCreateTotal = { inc: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.isEnabled = false;
    mockRedis.isWrongPasswordLimitExceeded.mockResolvedValue(false);
    mockRedis.recordWrongPasswordAttempt.mockResolvedValue(undefined);
    mockPasswordService.compare.mockResolvedValue(true);
    mockPasswordService.hash.mockResolvedValue('hashedpassword');
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    secureSecretCreate.mockReset();
    prismaServiceMock.secureSecretAttachment.findFirst.mockReset();
    prismaServiceMock.secureSecretAttachment.findFirst.mockResolvedValue(null);
    (prismaServiceMock.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          secureSecret: { create: secureSecretCreate },
          secureSecretAttachment: {
            create: jest.fn().mockResolvedValue({ id: 'att-1' }),
          },
        };
        return fn(tx);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        EncryptionService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        { provide: RedisService, useValue: mockRedis },
        { provide: PasswordService, useValue: mockPasswordService },
        {
          provide: getToken('secret_read_total'),
          useValue: mockSecretReadTotal,
        },
        {
          provide: getToken('secret_create_total'),
          useValue: mockSecretCreateTotal,
        },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);
    prisma = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('create', () => {
    const dto: CreateSecretDto = {
      content: 'secret message',
    };

    const createdSecret = {
      id: 'id-1',
      slug: 'abc123base64url',
      content: '', // set by mock from encrypted payload
      payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
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

    it('creates a secret with encrypted content and returns it with a generated slug', async () => {
      secureSecretCreate.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdSecret, ...data, content: data.content }),
      );

      const result = await service.create(dto);

      const createMock = secureSecretCreate as jest.Mock<
        Promise<unknown>,
        [SecureSecretCreateArgs]
      >;
      expect(createMock).toHaveBeenCalledTimes(1);
      const call = createMock.mock.calls[0][0];
      expect(call.data.content).not.toBe(dto.content);
      expect(call.data.content).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(encryptionService.decrypt(result.content)).toBe(dto.content);
      expect(call.data.slug).toBeDefined();
      expect(call.data.payloadMode).toBe(SecretPayloadMode.SERVER_ENCRYPTED);
      expect(call.data.hasAttachments).toBe(false);
      expect(call.data.passwordHash).toBeUndefined();
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
      expect(typeof call.data.slug).toBe('string');
      expect((call.data.slug as string).length).toBeGreaterThan(0);
      expect(call.data.expiresAt).toBeUndefined();
      expect(call.data.maxViews).toBeUndefined();
      expect(mockSecretCreateTotal.inc).toHaveBeenCalledTimes(1);
    });

    it('hashes and stores password when provided (client ciphertext)', async () => {
      const envelope = makeClientSecretEnvelope();
      const dtoWithPassword: CreateSecretDto = {
        content: envelope,
        password: 'MyPass1!',
      };
      secureSecretCreate.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdSecret, ...data, content: data.content }),
      );

      await service.create(dtoWithPassword);

      expect(mockPasswordService.hash).toHaveBeenCalledWith('MyPass1!');
      const createMock = secureSecretCreate as jest.Mock<
        Promise<unknown>,
        [SecureSecretCreateArgs]
      >;
      const call = createMock.mock.calls[0][0];
      expect(call.data.passwordHash).toBe('hashedpassword');
      expect(call.data.content).toBe(envelope);
      expect(call.data.payloadMode).toBe(SecretPayloadMode.CLIENT_CIPHERTEXT);
    });

    it('passes expiresAt and maxViews when provided', async () => {
      const dtoWithOpts: CreateSecretDto = {
        content: 'content',
        expiresAt: '2030-01-01T00:00:00.000Z',
        maxViews: 5,
      };
      secureSecretCreate.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdSecret, ...data, content: data.content }),
      );

      await service.create(dtoWithOpts);

      const createMock = secureSecretCreate as jest.Mock<
        Promise<unknown>,
        [SecureSecretCreateArgs]
      >;
      const call = createMock.mock.calls[0][0];
      expect(call.data.expiresAt).toEqual(new Date(dtoWithOpts.expiresAt));
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
      secureSecretCreate
        .mockRejectedValueOnce(err)
        .mockImplementationOnce(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...createdSecret, ...data, content: data.content }),
        );

      const result = await service.create(dto);

      expect(encryptionService.decrypt(result.content)).toBe(dto.content);
      const createMock = secureSecretCreate as jest.Mock<
        Promise<unknown>,
        [SecureSecretCreateArgs]
      >;
      expect(createMock).toHaveBeenCalledTimes(2);
      expect(mockSecretCreateTotal.inc).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-P2002 errors', async () => {
      const err = new Error('DB connection failed');
      secureSecretCreate.mockRejectedValue(err);

      await expect(service.create(dto)).rejects.toThrow('DB connection failed');
      const createMock = secureSecretCreate as jest.Mock<
        Promise<unknown>,
        [SecureSecretCreateArgs]
      >;
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(mockSecretCreateTotal.inc).not.toHaveBeenCalled();
    });
  });

  describe('readBySlug', () => {
    it('returns secret with decrypted content when read from DB', async () => {
      const plainContent = 'secret from db';
      const encryptedContent = encryptionService.encrypt(plainContent);
      const dbSecret = {
        id: 'id-1',
        slug: 'the-slug',
        content: encryptedContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
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
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(dbSecret);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...dbSecret, viewCount: 1 },
      ]);

      const result = await service.readBySlug('the-slug');

      expect(result).not.toBeNull();
      expect(result).toEqual({
        success: true,
        content: plainContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
        attachment: null,
      });
      expect(mockSecretReadTotal.inc).toHaveBeenCalledWith({
        source: 'postgres',
      });
    });

    it('returns secret after atomic increment even when stale Redis cache exists', async () => {
      const plainContent = 'secret from cache';
      const encryptedContent = encryptionService.encrypt(plainContent);
      const cachedSecret = {
        id: 'id-1',
        slug: 'cached-slug',
        content: encryptedContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
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
      mockRedis.get.mockResolvedValue(cachedSecret);
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(
        cachedSecret,
      );
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...cachedSecret, viewCount: 2 },
      ]);

      const result = await service.readBySlug('cached-slug');

      expect(result).not.toBeNull();
      expect(result).toEqual({
        success: true,
        content: plainContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
        attachment: null,
      });
      expect(mockSecretReadTotal.inc).toHaveBeenCalledWith({
        source: 'postgres',
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      expect(prisma.$queryRaw).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      expect(prisma.secureSecret.findFirst).toHaveBeenCalled();
    });

    it('returns null when DB has no eligible secret despite stale Redis cache', async () => {
      const encryptedContent = encryptionService.encrypt('burned');
      const cachedSecret = {
        id: 'id-1',
        slug: 'burned-slug',
        content: encryptedContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
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
      mockRedis.get.mockResolvedValue(cachedSecret);
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.readBySlug('burned-slug');

      expect(result).toBeNull();
      expect(mockSecretReadTotal.inc).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('purges stale Redis cache when cached secret is view-exhausted', async () => {
      const cachedSecret = {
        id: 'id-1',
        slug: 'burned-slug',
        content: encryptionService.encrypt('burned'),
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
        hasAttachments: false,
        passwordHash: null,
        expiresAt: null,
        lastViewedAt: null,
        maxViews: 2,
        viewCount: 2,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: null,
        userId: null,
      };
      mockRedis.isEnabled = true;
      mockRedis.get.mockResolvedValue(cachedSecret);
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.readBySlug('burned-slug');

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('secret:burned-slug');
    });

    it('returns null for password-protected secret burned in DB despite stale cache', async () => {
      const clientContent = makeClientSecretEnvelope();
      const cachedSecret = {
        id: 'id-1',
        slug: 'protected-burned-slug',
        content: clientContent,
        payloadMode: SecretPayloadMode.CLIENT_CIPHERTEXT,
        hasAttachments: false,
        passwordHash: 'hashed',
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
      mockRedis.get.mockResolvedValue(cachedSecret);
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.readBySlug('protected-burned-slug');

      expect(result).toBeNull();
      expect(mockPasswordService.compare).not.toHaveBeenCalled();
    });

    it('returns null when atomic increment fails despite eligible DB secret', async () => {
      const encryptedContent = encryptionService.encrypt('burned');
      const cachedSecret = {
        id: 'id-1',
        slug: 'burned-slug',
        content: encryptedContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
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
      mockRedis.get.mockResolvedValue(cachedSecret);
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(
        cachedSecret,
      );
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.readBySlug('burned-slug');

      expect(result).toBeNull();
      expect(mockSecretReadTotal.inc).not.toHaveBeenCalled();
    });

    it('deletes cache after final view when maxViews is reached', async () => {
      const plainContent = 'last view';
      const encryptedContent = encryptionService.encrypt(plainContent);
      const dbSecret = {
        id: 'id-1',
        slug: 'final-slug',
        content: encryptedContent,
        payloadMode: SecretPayloadMode.SERVER_ENCRYPTED,
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
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(dbSecret);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...dbSecret, viewCount: 1, isDeleted: true },
      ]);

      const result = await service.readBySlug('final-slug');

      expect(result).not.toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('secret:final-slug');
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('returns PASSWORD_REQUIRED when secret has password and none provided', async () => {
      const clientContent = makeClientSecretEnvelope();
      const dbSecret = {
        id: 'id-1',
        slug: 'protected-slug',
        content: clientContent,
        payloadMode: SecretPayloadMode.CLIENT_CIPHERTEXT,
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
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(dbSecret);

      const result = await service.readBySlug('protected-slug');

      expect(result).toEqual({ success: false, code: 'PASSWORD_REQUIRED' });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- same reference as jest.fn() in PrismaService test double
      const rawMock = prisma.$queryRaw as jest.Mock;
      expect(rawMock).not.toHaveBeenCalled();
    });

    it('returns INVALID_PASSWORD when password is wrong', async () => {
      const clientContent = makeClientSecretEnvelope();
      const dbSecret = {
        id: 'id-1',
        slug: 'protected-slug',
        content: clientContent,
        payloadMode: SecretPayloadMode.CLIENT_CIPHERTEXT,
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
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(dbSecret);
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
      const clientContent = makeClientSecretEnvelope();
      const dbSecret = {
        id: 'id-1',
        slug: 'protected-slug',
        content: clientContent,
        payloadMode: SecretPayloadMode.CLIENT_CIPHERTEXT,
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
      (prisma.secureSecret.findFirst as jest.Mock).mockResolvedValue(dbSecret);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { ...dbSecret, viewCount: 1 },
      ]);

      const result = await service.readBySlug('protected-slug', 'correct');

      expect(result).toEqual({
        success: true,
        content: clientContent,
        payloadMode: SecretPayloadMode.CLIENT_CIPHERTEXT,
        attachment: null,
      });
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        'correct',
        'hashed',
      );
    });
  });
});
