# Transactional Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Tambouille backend the ability to send an email over SMTP, with a startup check, bounded timeouts, and full test coverage — and nothing that consumes it.

**Architecture:** One `@Global()` `MailModule` exporting a `MailService` that wraps a single nodemailer SMTP transport built from environment variables. The service verifies the connection at startup without blocking boot, and its `send()` never throws — it returns a boolean so callers can react without a relay outage turning into an HTTP 500. A `npm run mail:test` CLI is the only thing that calls `send()` in this plan; it exists so the code is actually executed before a feature depends on it.

**Tech Stack:** NestJS 11, nodemailer, `@nestjs/config`, Jest 30 + ts-jest, Mailpit (local SMTP via Docker Compose).

**Spec:** `docs/superpowers/specs/2026-08-08-transactional-emails-design.md`

---

## Background for the implementer

Things about this codebase you need to know before starting:

- **Everything backend runs from `backend/`.** `npm` commands in this plan assume you are in `/Users/tristan/tambouille/backend` unless the command shows otherwise. Docker Compose runs from the repo root.
- **Two Jest suites.** Unit tests live next to the code and match `*.spec.ts` with `rootDir: "src"` (`backend/package.json`). E2E tests live in `backend/test/` and match `*.e2e-spec.ts` (`backend/test/jest-e2e.json`). `npm test` runs the first, `npm run test:e2e` the second.
- **`npm run test:e2e` is red before you start.** `backend/test/app.e2e-spec.ts` is the untouched `nest new` scaffold: it asserts `GET /` returns `"Hello World!"`, but there is no `AppController` and `backend/src/main.ts` sets a global `/api` prefix. Do not try to fix it — it is tracked in `TODOS.md`. Always run the e2e suite filtered to your own file, as the commands below do.
- **Booting `AppModule` needs Postgres.** `PrismaService.onModuleInit` calls `$connect()`. Run `docker compose up -d` from the repo root before any e2e task.
- **Existing test style.** Plain Jest with hand-rolled mocks and no `Test.createTestingModule` for unit tests — see `backend/src/comments/comments.service.spec.ts`. Follow it.
- **`tsconfig.json` uses `module: nodenext`** with no `"type": "module"` in `package.json`, so output is CommonJS. Relative imports are written without a `.js` extension throughout the codebase. Match that.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/src/mail/mail.service.ts` (create) | Builds the transport from config, verifies at startup, sends. The only file that knows nodemailer exists. |
| `backend/src/mail/mail.module.ts` (create) | `@Global()` wiring so no feature module has to import it. Mirrors `backend/src/prisma/prisma.module.ts`. |
| `backend/src/mail/mail.service.spec.ts` (create) | Unit coverage for all 13 code paths, nodemailer mocked. |
| `backend/src/mail/mail-test.ts` (create) | Standalone CLI that triggers one real send. Not part of the HTTP app. |
| `backend/src/app.module.ts` (modify) | One import line. |
| `backend/test/mail-boot.e2e-spec.ts` (create) | Regression: the app boots with an unreachable relay. |
| `backend/.env.example` (modify) | Documents the six new variables. |
| `backend/package.json` (modify) | Two dependencies, one script. |
| `docker-compose.yml` (modify) | Mailpit service. |

`mail-test.ts` is separate from the service on purpose: it is an operator tool with a `process.exit`, and mixing that into an injectable would make the service untestable.

---

### Task 1: Dependencies, Mailpit, and environment

No tests in this task — it is configuration, and Step 6 verifies it by hand.

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Install nodemailer**

From `backend/`:

```bash
npm install nodemailer && npm install --save-dev @types/nodemailer
```

- [ ] **Step 2: Add the Mailpit service**

Edit `docker-compose.yml` at the repo root. Add the `mailpit` service under `services:`, after the `postgres` block and before the top-level `volumes:` key:

```yaml
  mailpit:
    image: axllent/mailpit:latest
    container_name: tambouille-mailpit
    restart: unless-stopped
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # web UI
```

Mailpit keeps everything in memory, so it needs no volume.

- [ ] **Step 3: Document the environment variables**

Append to `backend/.env.example`:

```
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
MAIL_FROM="Tambouille <no-reply@pantagruweb.club>"
```

`SMTP_USER` and `SMTP_PASS` are empty for Mailpit, which accepts unauthenticated connections. Leaving `SMTP_USER` empty is what makes the service skip the `auth` object entirely.

- [ ] **Step 4: Copy the variables into your own `.env`**

`backend/.env` is gitignored, so it does not update itself. Append the same six lines to it:

```bash
cat >> .env <<'EOF'

SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
MAIL_FROM="Tambouille <no-reply@pantagruweb.club>"
EOF
```

- [ ] **Step 5: Add the CLI script**

In `backend/package.json`, add this entry to `"scripts"`, right after `"start:prod"`:

```json
    "mail:test": "ts-node src/mail/mail-test.ts",
```

The script itself is written in Task 6. Adding it now keeps all the packaging changes in one commit.

- [ ] **Step 6: Start Mailpit and verify it is reachable**

From the repo root:

```bash
docker compose up -d && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8025
```

Expected: `200`. If you get `000`, the container did not start — check `docker compose logs mailpit`.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example docker-compose.yml
git commit -m "chore: add nodemailer and a Mailpit service for local SMTP"
```

---

### Task 2: MailService — transport construction

The constructor is where two certain bugs live: `SMTP_SECURE=false` arrives as the string `"false"`, which is truthy, and `SMTP_PORT` arrives as a string where nodemailer wants a number. The tests below are a truth table over that.

**Files:**
- Create: `backend/src/mail/mail.service.ts`
- Test: `backend/src/mail/mail.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `backend/src/mail/mail.service.spec.ts`:

```ts
import { createTransport } from 'nodemailer';
import type { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransportMock = createTransport as jest.MockedFunction<typeof createTransport>;

const BASE_ENV: Record<string, string> = {
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  SMTP_USER: '',
  SMTP_PASS: '',
  MAIL_FROM: 'Tambouille <no-reply@pantagruweb.club>',
};

function createTransporterMock() {
  return {
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  };
}

/**
 * Builds a MailService over a stubbed ConfigService and returns the service,
 * the fake transporter, and the options createTransport was called with.
 */
function buildService(overrides: Record<string, string> = {}) {
  const env = { ...BASE_ENV, ...overrides };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const transporter = createTransporterMock();
  createTransportMock.mockReturnValue(transporter as never);
  const service = new MailService(config);
  const options = createTransportMock.mock.calls.at(-1)![0] as Record<string, unknown>;
  return { service, transporter, options };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MailService construction', () => {
  it('passes an auth object when SMTP_USER is set', () => {
    const { options } = buildService({ SMTP_USER: 'apikey', SMTP_PASS: 'secret' });
    expect(options.auth).toEqual({ user: 'apikey', pass: 'secret' });
  });

  it('passes no auth key at all when SMTP_USER is empty', () => {
    const { options } = buildService({ SMTP_USER: '' });
    expect(options).not.toHaveProperty('auth');
  });

  it('reads SMTP_SECURE="false" as the boolean false', () => {
    const { options } = buildService({ SMTP_SECURE: 'false' });
    expect(options.secure).toBe(false);
  });

  it('reads SMTP_SECURE="true" as the boolean true', () => {
    const { options } = buildService({ SMTP_SECURE: 'true' });
    expect(options.secure).toBe(true);
  });

  it('reads SMTP_PORT as a number', () => {
    const { options } = buildService({ SMTP_PORT: '1025' });
    expect(options.port).toBe(1025);
  });

  it('bounds the transport timeouts', () => {
    const { options } = buildService();
    expect(options.connectionTimeout).toBe(5000);
    expect(options.greetingTimeout).toBe(5000);
    expect(options.socketTimeout).toBe(10000);
  });

  it('throws when MAIL_FROM is missing', () => {
    expect(() => buildService({ MAIL_FROM: '' })).toThrow(/MAIL_FROM/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

From `backend/`:

```bash
npm test -- mail.service
```

Expected: FAIL, `Cannot find module './mail.service'`.

- [ ] **Step 3: Write the minimal implementation**

Create `backend/src/mail/mail.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * The application's only way out to the outside world.
 *
 *   ConfigService ──> createTransport   [lazy: connects to nothing]
 *                          │
 *                     send() ──> sendMail ──> ok    : true
 *                                         └─> échec : log (adresse masquée), false
 *
 * Nothing here throws once construction succeeds, so the startup verify() added
 * in the next task is the only place a bad configuration becomes visible.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const from = config.get<string>('MAIL_FROM');
    if (!from) {
      // verify() tests the connection, not the envelope, so a missing sender
      // would otherwise only surface at the first real send.
      throw new Error('MAIL_FROM is required');
    }
    this.from = from;

    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST'),
      // Env values are strings: Number() for the port, and an explicit
      // comparison for secure because the string "false" is truthy.
      port: Number(config.get<string>('SMTP_PORT')),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      ...(user ? { auth: { user, pass } } : {}),
      // nodemailer's defaults (2min / 30s / 10min) would let a hung relay hold
      // an awaited HTTP request open for minutes.
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- mail.service
```

Expected: PASS, 7 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/mail/mail.service.ts backend/src/mail/mail.service.spec.ts
git commit -m "feat(mail): build the SMTP transport from validated env config"
```

---

### Task 3: Startup verification

`createTransport()` opens no connection. Without this, a typo in `SMTP_HOST` stays invisible until the first send — which `send()` will swallow in the next task. The failure path must log loudly and still let the app start.

**Files:**
- Modify: `backend/src/mail/mail.service.ts`
- Test: `backend/src/mail/mail.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/mail/mail.service.spec.ts`, after the `describe('MailService construction', ...)` block:

```ts
describe('MailService startup verification', () => {
  it('logs and does not throw when the transport verifies', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { service, transporter } = buildService();

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(transporter.verify).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
  });

  it('logs an error but still resolves when the transport is unreachable', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { service, transporter } = buildService();
    transporter.verify.mockRejectedValue(new Error('ECONNREFUSED'));

    // Resolving is the whole point: a relay outage must not keep the API down.
    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
  });
});
```

The spec file does not import `Logger` yet. Add this line at the top of `backend/src/mail/mail.service.spec.ts`, above the existing `import { createTransport } from 'nodemailer';`:

```ts
import { Logger } from '@nestjs/common';
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- mail.service
```

Expected: FAIL, `service.onModuleInit is not a function`.

- [ ] **Step 3: Write the minimal implementation**

In `backend/src/mail/mail.service.ts`, change the import line and the class declaration, then add the method.

Import line becomes:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
```

Class declaration becomes:

```ts
export class MailService implements OnModuleInit {
```

Add this method as the last member of the class, after the constructor:

```ts
  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP transport ready');
    } catch (error) {
      // Deliberately non-fatal. Making this throw would couple the whole API's
      // availability to the relay's, and would take the e2e suite down with it.
      this.logger.error(`SMTP transport unavailable: ${String(error)}`);
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- mail.service
```

Expected: PASS, 9 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/mail/mail.service.ts backend/src/mail/mail.service.spec.ts
git commit -m "feat(mail): verify the SMTP connection at startup without blocking boot"
```

---

### Task 4: Sending

`send()` returns a boolean rather than `void` so a consumer that legitimately needs the outcome can have it, and never throws so a forgotten `try/catch` cannot turn a relay outage into a 500. Failure logs carry the recipient's domain but not their identity.

**Files:**
- Modify: `backend/src/mail/mail.service.ts`
- Test: `backend/src/mail/mail.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/mail/mail.service.spec.ts`, after the startup verification block:

```ts
describe('MailService.send', () => {
  const message = {
    to: 'jean.dupont@gmail.com',
    subject: 'Réinitialisation',
    text: 'Clique ici.',
  };

  it('returns true when the relay accepts the message', async () => {
    const { service } = buildService();
    await expect(service.send(message)).resolves.toBe(true);
  });

  it('returns false when the relay rejects the message', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { service, transporter } = buildService();
    transporter.sendMail.mockRejectedValue(new Error('550 rejected'));

    await expect(service.send(message)).resolves.toBe(false);
  });

  it('fills the sender from MAIL_FROM', async () => {
    const { service, transporter } = buildService();
    await service.send(message);

    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: BASE_ENV.MAIL_FROM, to: message.to }),
    );
  });

  it('leaves html undefined when the caller omits it', async () => {
    const { service, transporter } = buildService();
    await service.send(message);

    const sent = transporter.sendMail.mock.calls[0][0];
    expect(sent.html).toBeUndefined();
    expect(sent.text).toBe('Clique ici.');
  });

  it('passes html through when the caller provides it', async () => {
    const { service, transporter } = buildService();
    await service.send({ ...message, html: '<p>Clique ici.</p>' });

    const sent = transporter.sendMail.mock.calls[0][0];
    expect(sent.html).toBe('<p>Clique ici.</p>');
  });

  it('masks the recipient local-part in the failure log', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { service, transporter } = buildService();
    transporter.sendMail.mockRejectedValue(new Error('550 rejected'));

    await service.send(message);

    const logged = error.mock.calls[0][0] as string;
    expect(logged).toContain('***@gmail.com');
    expect(logged).not.toContain('jean.dupont');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- mail.service
```

Expected: FAIL, `service.send is not a function`.

- [ ] **Step 3: Write the minimal implementation**

In `backend/src/mail/mail.service.ts`, add this interface above the `@Injectable()` decorator:

```ts
export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
```

Add this method to the class, after `onModuleInit`:

```ts
  /**
   * Never throws. Returns whether the relay accepted the message, so a caller
   * that needs to tell the user can, and one that must not leak (password
   * reset) can ignore it.
   */
  async send(options: SendMailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({ from: this.from, ...options });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send "${options.subject}" to ${maskAddress(options.to)}: ${String(error)}`,
      );
      return false;
    }
  }
```

Add this function at the bottom of the file, outside the class:

```ts
/**
 * `jean.dupont@gmail.com` -> `***@gmail.com`. The domain is what actually helps
 * diagnosis; the person's identity only puts personal data in the log stream.
 */
function maskAddress(address: string): string {
  const at = address.lastIndexOf('@');
  return at === -1 ? '***' : `***${address.slice(at)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- mail.service
```

Expected: PASS, 15 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/mail/mail.service.ts backend/src/mail/mail.service.spec.ts
git commit -m "feat(mail): add send() returning delivery success without throwing"
```

---

### Task 5: Module wiring

**Files:**
- Create: `backend/src/mail/mail.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

Create `backend/src/mail/mail.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';

/**
 * Global for the same reason PrismaModule is: every future feature module will
 * want it, and none of them should have to import it. ConfigModule is imported
 * explicitly so this module also works in a standalone context (mail-test.ts),
 * where AppModule's global ConfigModule.forRoot has not run.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

- [ ] **Step 2: Wire it into AppModule**

In `backend/src/app.module.ts`, add the import next to the other module imports:

```ts
import { MailModule } from './mail/mail.module';
```

and add `MailModule,` to the `imports` array, after `PrismaModule,`:

```ts
    PrismaModule,
    MailModule,
    AuthModule,
```

- [ ] **Step 3: Verify the app boots**

Make sure Postgres and Mailpit are up first (`docker compose up -d` from the repo root), then from `backend/`:

```bash
npm run start:dev
```

Expected: the log line `SMTP transport ready` from `MailService`, then `Nest application successfully started`. Stop it with Ctrl-C.

If you instead see `SMTP transport unavailable`, Mailpit is not running or `SMTP_PORT` in your `.env` is wrong — fix that before continuing, the rest of the plan depends on a working local relay.

- [ ] **Step 4: Commit**

```bash
git add backend/src/mail/mail.module.ts backend/src/app.module.ts
git commit -m "feat(mail): register MailModule globally in AppModule"
```

---

### Task 6: The `mail:test` CLI

Until this exists, nothing in the codebase reaches `sendMail()` and none of this code has ever run against a real relay.

**Files:**
- Create: `backend/src/mail/mail-test.ts`

- [ ] **Step 1: Write the script**

Create `backend/src/mail/mail-test.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MailModule } from './mail.module';
import { MailService } from './mail.service';

/**
 * Deliberately not AppModule: booting the whole app would drag in Prisma and
 * require a database for what is only a check of the SMTP configuration.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MailModule],
})
class MailTestModule {}

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npm run mail:test -- <address>');
    process.exit(1);
  }

  const context = await NestFactory.createApplicationContext(MailTestModule);
  const mail = context.get(MailService);

  const sent = await mail.send({
    to,
    subject: 'Tambouille — test SMTP',
    text: 'Si tu lis ceci, la configuration SMTP fonctionne.',
  });

  await context.close();

  if (sent) {
    console.log(`OK: message accepted for ${to}`);
    process.exit(0);
  }

  console.error('FAILED: the relay rejected the message, see the error logged above');
  process.exit(1);
}

void main();
```

- [ ] **Step 2: Run it against Mailpit**

From `backend/`:

```bash
npm run mail:test -- dev@example.com
```

Expected: `SMTP transport ready`, then `OK: message accepted for dev@example.com`, exit code 0.

- [ ] **Step 3: Confirm the message actually arrived**

```bash
curl -s http://localhost:8025/api/v1/messages | head -c 400
```

Expected: JSON containing `"To"` with `dev@example.com` and a `"Subject"` of `Tambouille — test SMTP`. This is the first end-to-end proof that the transport works.

- [ ] **Step 4: Verify the missing-argument path**

```bash
npm run mail:test; echo "exit=$?"
```

Expected: `Usage: npm run mail:test -- <address>` and a non-zero exit.

- [ ] **Step 5: Verify the failure path**

```bash
SMTP_PORT=1 npm run mail:test -- dev@example.com; echo "exit=$?"
```

Expected: an `SMTP transport unavailable` error log, then `FAILED: the relay rejected the message...`, and a non-zero exit. Port 1 refuses the connection immediately, which also confirms the timeouts do not make you wait.

- [ ] **Step 6: Commit**

```bash
git add backend/src/mail/mail-test.ts
git commit -m "feat(mail): add npm run mail:test to trigger a real send"
```

---

### Task 7: Boot regression test

`app.init()` runs `onModuleInit`, so `verify()` executes inside the e2e suite, on machines with no relay. This test is the guarantee that the non-blocking choice in Task 3 holds.

**Files:**
- Create: `backend/test/mail-boot.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/test/mail-boot.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';

/**
 * Requires Postgres (PrismaService connects on init): `docker compose up -d`.
 * Does NOT require an SMTP server — that is the point.
 */
describe('Mail boot (e2e)', () => {
  let app: INestApplication | undefined;
  const original = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    from: process.env.MAIL_FROM,
  };

  beforeAll(() => {
    // Port 1 refuses the connection immediately, so verify() fails fast.
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1';
    process.env.MAIL_FROM = 'Tambouille <no-reply@example.com>';
  });

  afterAll(async () => {
    process.env.SMTP_HOST = original.host;
    process.env.SMTP_PORT = original.port;
    process.env.MAIL_FROM = original.from;
    if (app) {
      await app.close();
    }
  });

  it('starts even though the SMTP relay is unreachable', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await expect(app.init()).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Run it and watch it pass**

Make sure Postgres is up (`docker compose up -d` from the repo root), then from `backend/`:

```bash
npm run test:e2e -- mail-boot
```

Expected: PASS, 1 passed. The output includes an `SMTP transport unavailable` error log — that is the code under test doing its job, not a failure.

Run only this file. `npm run test:e2e` with no filter also runs `app.e2e-spec.ts`, which fails for reasons predating this work (see `TODOS.md`).

- [ ] **Step 3: Prove the test would catch a regression**

Temporarily make the failure fatal. In `backend/src/mail/mail.service.ts`, add `throw error;` as the last line of the `catch` block in `onModuleInit`, then:

```bash
npm run test:e2e -- mail-boot
```

Expected: FAIL. Now remove the `throw error;` line and re-run:

```bash
npm run test:e2e -- mail-boot
```

Expected: PASS. Do not commit until this second run is green — a regression test that cannot fail is decoration.

- [ ] **Step 4: Run the full unit suite**

```bash
npm test
```

Expected: PASS, including the pre-existing `comments.service.spec.ts` and `playlists.service.spec.ts`.

- [ ] **Step 5: Commit**

```bash
git add backend/test/mail-boot.e2e-spec.ts
git commit -m "test(mail): assert the app boots with an unreachable SMTP relay"
```

---

## Done when

- `npm test` is green, 15 mail unit tests included.
- `npm run test:e2e -- mail-boot` is green.
- `npm run mail:test -- <address>` delivers to Mailpit and exits 0; with `SMTP_PORT=1` it exits non-zero within a couple of seconds.
- `npm run start:dev` logs `SMTP transport ready`.
- Nothing on a request path calls `send()`. The password reset spec is next and will not need to modify any file created here.

## Production rollout

Not part of this plan's commits, but the reason it exists:

1. Pick an SMTP relay, add its SPF and DKIM records to `pantagruweb.club` in Cloudflare, verify the domain.
2. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` in the production environment.
3. Deploy, then run `npm run mail:test -- <your address>` against production to smoke-test the real relay without mailing a real user.
