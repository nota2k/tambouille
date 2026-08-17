import { INestApplication, type Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Imported inside the tests, not at the top. `src/common/upload.utils.ts`
 * reads its R2 variables at module scope, so a static import here would
 * evaluate them before `beforeAll` had a chance to set them.
 */
function loadAppModule(): Type<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require('./../src/app.module') as { AppModule: Type<unknown> };
  return loaded.AppModule;
}

/**
 * The guarantee: no SMTP configuration fault can stop the API from starting.
 *
 * MailService reads its variables lazily and its onModuleInit swallows
 * whatever they throw, which is what keeps a relay outage — or a missing
 * variable — out of the boot path. Nothing else pins that, and losing it
 * would not fail any unit test.
 *
 * Requires Postgres (PrismaService connects on init): `docker compose up -d`.
 * Requires no SMTP server, which is the point.
 */
describe('Mail boot (e2e)', () => {
  let app: INestApplication | undefined;
  const saved = { ...process.env };

  beforeAll(() => {
    // Port 1 refuses the connection immediately, so verify() fails fast.
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = '';
    process.env.SMTP_FROM = 'Tambouille <no-reply@example.com>';
    // R2 builds its client eagerly and refuses to start without these, which
    // has nothing to do with what this test is about.
    process.env.R2_ACCOUNT_ID ??= 'test';
    process.env.R2_ACCESS_KEY_ID ??= 'test';
    process.env.R2_SECRET_ACCESS_KEY ??= 'test';
    process.env.R2_BUCKET_NAME ??= 'test';
    // Same reasoning, and the one that only CI could reveal. `JwtStrategy`
    // throws in its constructor when `JWT_SECRET` is absent, so `AppModule`
    // cannot be built at all without it. On a developer machine the variable
    // arrives from `backend/.env`, which `ConfigModule` reads off the disk —
    // so no amount of scrubbing the *environment* locally reproduces a runner,
    // where that file does not exist and never will, being gitignored.
    // Setting it here makes the test carry its own configuration instead of
    // borrowing whatever the machine happens to hold.
    process.env.JWT_SECRET ??= 'test';
  });

  afterAll(async () => {
    process.env = saved;
    if (app) {
      await app.close();
    }
  });

  it('starts even though the SMTP relay is unreachable', async () => {
    const AppModule = loadAppModule();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await expect(app.init()).resolves.toBeDefined();
  });

  it('starts even though an SMTP variable is invalid', async () => {
    // Not a deletion: dotenv would put SMTP_HOST back from .env on the next
    // ConfigModule.forRoot, and the test would pass without testing anything.
    // dotenv does not overwrite a variable that is already set, so a garbage
    // value survives where an absent one would not.
    process.env.SMTP_PORT = 'abc';

    const AppModule = loadAppModule();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const second = moduleFixture.createNestApplication();
    await expect(second.init()).resolves.toBeDefined();
    await second.close();
  });
});
