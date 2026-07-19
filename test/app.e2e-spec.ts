import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { randomBytes } from 'node:crypto';

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

type CreateSecretResponseBody = {
  slug: string;
  url: string;
  expiresAt: unknown;
  maxViews: unknown;
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = '0'.repeat(64);
    }
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('POST /s (create secret)', () => {
    it('returns 201 with slug, url, expiresAt, maxViews for valid body', () => {
      return request(app.getHttpServer())
        .post('/s')
        .send({ content: 'hello world' })
        .expect(201)
        .expect((res) => {
          const body = res.body as CreateSecretResponseBody;
          expect(body).toHaveProperty('slug');
          expect(typeof body.slug).toBe('string');
          expect(body.slug.length).toBeGreaterThan(0);
          expect(body).toHaveProperty('url');
          expect(body.url).toContain('/s/' + body.slug);
          expect(body).toHaveProperty('expiresAt');
          expect(body).toHaveProperty('maxViews');
        });
    });

    it('returns 400 when content is missing', () => {
      return request(app.getHttpServer()).post('/s').send({}).expect(400);
    });

    it('returns 400 when content is empty string', () => {
      return request(app.getHttpServer())
        .post('/s')
        .send({ content: '' })
        .expect(400);
    });

    it('returns 400 when content is whitespace only', () => {
      return request(app.getHttpServer())
        .post('/s')
        .send({ content: '   ' })
        .expect(400);
    });

    it('returns 400 when maxViews is less than 1', () => {
      return request(app.getHttpServer())
        .post('/s')
        .send({ content: 'hello', maxViews: 0 })
        .expect(400);
    });

    it('returns 400 when expiresAt is in the past', () => {
      return request(app.getHttpServer())
        .post('/s')
        .send({
          content: 'hello',
          expiresAt: '2020-01-01T00:00:00.000Z',
        })
        .expect(400);
    });

    it('returns 201 with client ciphertext when password is set', () => {
      const envelope = makeClientSecretEnvelope();
      return request(app.getHttpServer())
        .post('/s')
        .send({
          content: envelope,
          password: 'Aa1!aaaa',
          expiresAt: '2030-01-01T00:00:00.000Z',
          maxViews: 2,
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as { slug?: unknown };
          expect(body.slug).toBeDefined();
        });
    });
  });

  describe('POST /s/multipart', () => {
    (process.env.REDIS_URL ? it : it.skip)(
      'returns 429 after 3 creates per minute (create rate limit)',
      async () => {
        const ua = `e2e-multipart-ratelimit-${randomBytes(8).toString('hex')}`;
        for (let i = 1; i <= 3; i++) {
          await request(app.getHttpServer())
            .post('/s/multipart')
            .set('User-Agent', ua)
            .field('content', `secret ${i}`)
            .expect(201);
        }
        await request(app.getHttpServer())
          .post('/s/multipart')
          .set('User-Agent', ua)
          .field('content', 'secret 4')
          .expect(429)
          .expect((res) => {
            const body = res.body as { message?: string };
            expect(body.message).toMatch(/Too many secrets created/i);
          });
      },
    );

    it('returns 201 with text file attachment (server-encrypted)', () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      return request(app.getHttpServer())
        .post('/s/multipart')
        .field('content', 'secret with file')
        .field('expiresAt', future)
        .field('maxViews', '2')
        .attach('file', Buffer.from('hello file'), {
          filename: 'hello.txt',
          contentType: 'text/plain',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as { slug?: unknown };
          expect(body.slug).toBeDefined();
        });
    });
  });

  describe('GET /s/:slug', () => {
    it('returns payloadMode, content, and attachment for server-encrypted secret with file', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const create = await request(app.getHttpServer())
        .post('/s/multipart')
        .field('content', 'body text')
        .field('expiresAt', future)
        .field('maxViews', '5')
        .attach('file', randomBytes(32), {
          filename: 'blob.bin',
          contentType: 'application/pdf',
        })
        .expect(201);
      const slug = (create.body as { slug: string }).slug;
      const read = await request(app.getHttpServer())
        .get(`/s/${slug}`)
        .expect(200);
      const body = read.body as {
        payloadMode: string;
        content: string;
        attachment: {
          mimeType: string;
          originalName: string;
          data: string;
        } | null;
      };
      expect(body.payloadMode).toBe('SERVER_ENCRYPTED');
      expect(body.content).toBe('body text');
      expect(body.attachment).not.toBeNull();
      expect(body.attachment?.mimeType).toBe('application/pdf');
      expect(body.attachment?.originalName).toBe('blob.bin');
      expect(typeof body.attachment?.data).toBe('string');
      expect(read.headers['cache-control']).toMatch(/no-store/i);
    });

    it('returns opaque content for client ciphertext secret with password', async () => {
      const envelope = makeClientSecretEnvelope();
      const create = await request(app.getHttpServer())
        .post('/s')
        .send({
          content: envelope,
          password: 'Bb2@bbbb',
          expiresAt: '2030-06-01T00:00:00.000Z',
          maxViews: 3,
        })
        .expect(201);
      const slug = (create.body as { slug: string }).slug;
      const read = await request(app.getHttpServer())
        .get(`/s/${slug}`)
        .set('X-Secret-Password', 'Bb2@bbbb')
        .expect(200);
      const body = read.body as {
        payloadMode: string;
        content: string;
        attachment: unknown;
      };
      expect(body.payloadMode).toBe('CLIENT_CIPHERTEXT');
      expect(body.content).toBe(envelope);
      expect(body.attachment).toBeNull();
    });
  });
});
