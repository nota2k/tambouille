# Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users sign up and sign in with Google. When the email already belongs to an account, refuse and send the user to the password flow.

> **Amended 2026-08-08, after implementation.** This plan was written for *automatic* linking, gated on Google reporting `email_verified: true`. The final review showed that gate only proves the Google side: Tambouille verifies no email addresses, so anyone can register `victim@corp.com` by password without owning it. The victim's later Google sign-in would then be linked onto the attacker's row and hand them the victim's session, with the attacker keeping password access.
>
> Automatic linking was therefore **removed** before merge. The sections below have been amended to describe what shipped. If you are adding email verification and want linking back, that is a new decision to take deliberately — do not reinstate it by copying an older revision of this file.

**Architecture:** The frontend uses Google Identity Services to obtain a signed ID token and POSTs it to `POST /api/auth/google`. The backend verifies that token against Google's public keys, resolves or creates the user, and issues the same JWT the password flow already issues. No redirect flow, no client secret. Accounts created this way start with `username: null` and `password: null`; the frontend forces a username choice before letting them in, and settings let them add a password later.

**Tech Stack:** NestJS 11, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, `google-auth-library`, bcrypt, Vue 3 + Pinia + Vue Router, Google Identity Services (browser script).

## Global Constraints

- Username rules must stay identical everywhere: `@MinLength(3)`, `@MaxLength(30)`, `@Matches(/^[a-zA-Z0-9_.-]+$/)` — copied from `backend/src/auth/dto/register.dto.ts`.
- Password rules must stay identical everywhere: `@MinLength(8)`, `@MaxLength(72)`. Hashing uses `bcrypt` with `SALT_ROUNDS = 12`, as in `AuthService`.
- An email that already belongs to an account must **always** return 409, whatever `email_verified` says and whatever the row's current `googleId` is. No `googleId` is ever written onto an existing row. An account is created only when no row holds that address **and** Google reports the address verified.
- `GOOGLE_CLIENT_ID` must be read **lazily**, at the moment a Google sign-in is attempted — never at module load or in a constructor. Reading it eagerly would make the whole API fail to boot when the variable is missing, which is exactly how this project's R2 configuration took production down on 2026-08-08.
- Tests follow the existing style: plain Jest, a hand-written Prisma mock, direct instantiation of the service (see `backend/src/comments/comments.service.spec.ts`). No `@nestjs/testing` module compilation.
- Run backend tests with `npm test` from `backend/`.
- Every commit ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Manual prerequisite

The user creates an OAuth client of type "Web application" in Google Cloud Console, authorising `https://tambouille.pantagruweb.club` and `http://localhost:5173` as JavaScript origins. It yields a public client ID ending in `.apps.googleusercontent.com`. No client secret is needed. This value goes into `backend/.env` as `GOOGLE_CLIENT_ID` and `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`. Task 4 and Task 7 need it; Tasks 1–3, 5 and 6 do not.

## File structure

| File | Responsibility |
|---|---|
| `backend/prisma/schema.prisma` | Modify: `password` and `username` nullable, add `googleId` |
| `backend/src/auth/google-token-verifier.ts` | Create: wraps `google-auth-library`, turns an ID token into a `GoogleIdentity`. Isolated so `AuthService` can be tested without network access. |
| `backend/src/auth/auth.service.ts` | Modify: reject passwordless password-login, add `loginWithGoogle`, `setUsername`, `setPassword` |
| `backend/src/auth/auth.service.spec.ts` | Create: unit tests for all of the above |
| `backend/src/auth/dto/google-login.dto.ts` | Create: `{ idToken }` |
| `backend/src/auth/dto/set-username.dto.ts` | Create: `{ username }` with the shared rules |
| `backend/src/auth/dto/set-password.dto.ts` | Create: `{ password }` with the shared rules |
| `backend/src/auth/auth.controller.ts` | Modify: three new routes |
| `backend/src/auth/auth.module.ts` | Modify: provide `GoogleTokenVerifier` |
| `frontend/src/components/GoogleSignInButton.vue` | Create: renders and drives the Google button |
| `frontend/src/stores/auth.ts` | Modify: `loginWithGoogle`, `setUsername`, `setPassword` |
| `frontend/src/views/ChooseUsernameView.vue` | Create: the post-signup username screen |
| `frontend/src/router/index.ts` | Modify: route plus the pending-account guard |
| `frontend/src/views/LoginView.vue`, `RegisterView.vue` | Modify: add the Google button |
| `frontend/src/views/ProfileView.vue` | Modify: "set a password" section |

---

### Task 1: Make the schema accommodate Google accounts

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_google_auth/migration.sql` (generated)

**Interfaces:**
- Produces: a `User` model where `password` and `username` are nullable and `googleId String? @unique` exists. Every later backend task depends on this.

- [ ] **Step 1: Edit the model**

In `backend/prisma/schema.prisma`, inside `model User`, replace the `username` and `password` lines and add `googleId`:

```prisma
  email       String   @unique
  // Null until a Google-created account picks one. Postgres allows several
  // NULLs under a unique constraint, so pending accounts can coexist.
  username    String?  @unique
  // Null for accounts that only sign in with Google.
  password    String?
  // Google's stable subject claim. Stored rather than matching on email, so a
  // user who later changes their Google address still resolves to this account.
  googleId    String?  @unique
  displayName String
```

- [ ] **Step 2: Create the migration**

```bash
cd backend && npx prisma migrate dev --name google_auth
```

Expected: a new folder under `prisma/migrations/`, and `ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL` plus the `googleId` column in its `migration.sql`. The Prisma client is regenerated automatically.

- [ ] **Step 3: Confirm the database matches**

```bash
cd backend && npx prisma migrate status
```

Expected: `Database schema is up to date!`

- [ ] **Step 4: Confirm the project still compiles**

```bash
cd backend && npm run build
```

Expected: exit 0. TypeScript now types `user.username` as `string | null`; if the build reports errors elsewhere, fix them by narrowing, not by casting.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma
git commit -m "feat(auth): allow users without password or username

Google-created accounts have neither at first.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Refuse password login on a passwordless account

**Files:**
- Create: `backend/src/auth/auth.service.spec.ts`
- Modify: `backend/src/auth/auth.service.ts`

**Interfaces:**
- Consumes: the nullable `password` from Task 1.
- Produces: `createPrismaMock()` and the `describe('AuthService')` scaffold that Tasks 3, 5 and 6 extend.

Without this, `bcrypt.compare(dto.password, null)` runs on every Google-only account that someone tries to password-login into.

- [ ] **Step 1: Write the failing test**

Create `backend/src/auth/auth.service.spec.ts`:

```typescript
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleTokenVerifier } from './google-token-verifier';

/**
 * Prisma, the JWT signer and Google's verifier are all mocked: these tests
 * cover the service's own rules — who may sign in, when an account is linked
 * rather than created — not the database, JWTs, or Google's cryptography.
 */
function createPrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createVerifierMock() {
  return { verify: jest.fn() };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let verifier: ReturnType<typeof createVerifierMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    verifier = createVerifierMock();
    service = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: jest.fn().mockResolvedValue('signed-token') } as unknown as JwtService,
      verifier as unknown as GoogleTokenVerifier,
    );
  });

  describe('login', () => {
    it('refuses an account that has no password, without calling bcrypt', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'nelly@example.com',
        username: 'nelly',
        password: null,
        displayName: 'Nelly',
      });

      await expect(
        service.login({ emailOrUsername: 'nelly@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: FAIL. `GoogleTokenVerifier` does not exist yet, so the import fails to resolve.

- [ ] **Step 3: Create the verifier's file with its shape only**

Create `backend/src/auth/google-token-verifier.ts`:

```typescript
import { Injectable } from '@nestjs/common';

/** What the application needs out of a verified Google ID token. */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

@Injectable()
export class GoogleTokenVerifier {
  // Implemented in Task 3. Declared here so AuthService can depend on it.
  verify(_idToken: string): Promise<GoogleIdentity> {
    throw new Error('not implemented');
  }
}
```

- [ ] **Step 4: Run again and watch it fail for the right reason**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: FAIL, now inside the test body — `AuthService`'s constructor takes two arguments, not three.

- [ ] **Step 5: Widen the constructor and guard the login**

In `backend/src/auth/auth.service.ts`, add the third dependency:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleVerifier: GoogleTokenVerifier,
  ) {}
```

with `import { GoogleTokenVerifier } from './google-token-verifier';` at the top, and insert this in `login`, immediately after the `if (!user)` block:

```typescript
    // A Google-only account has no password. The message stays identical to a
    // wrong password: telling the two apart would reveal which addresses are
    // linked to Google, and let an attacker narrow their targets.
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
```

- [ ] **Step 6: Run and watch it pass**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add backend/src/auth
git commit -m "fix(auth): reject password login on passwordless accounts

Returns the same generic error as a wrong password, so the API does not
disclose which addresses are Google-only.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Verify Google tokens and resolve the account

**Files:**
- Modify: `backend/src/auth/google-token-verifier.ts`
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `GoogleIdentity` and the test scaffold from Task 2.
- Produces: `AuthService.loginWithGoogle(idToken: string): Promise<{ accessToken: string; user: PublicUser }>`, consumed by Task 4.

- [ ] **Step 1: Install the library**

```bash
cd backend && npm install google-auth-library
```

- [ ] **Step 2: Write the four failing tests**

Append inside `describe('AuthService')` in `backend/src/auth/auth.service.spec.ts`:

```typescript
  describe('loginWithGoogle', () => {
    const IDENTITY = {
      googleId: 'google-sub-1',
      email: 'nelly@example.com',
      emailVerified: true,
      displayName: 'Nelly',
    };

    it('signs in an account already linked to this Google identity', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1', email: IDENTITY.email, username: 'nelly',
        password: null, displayName: 'Nelly', googleId: IDENTITY.googleId,
      });

      const result = await service.loginWithGoogle('token');

      expect(result.user.id).toBe('u1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // AMENDED: this test originally asserted that a verified identity was linked
    // onto the matching account. That behaviour was removed before merge — see the
    // amendment note at the top of this plan. The refusal must not depend on
    // emailVerified, which is why the fixture here is deliberately verified.
    it('refuses a verified Google identity whose email already has an account', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // no match on googleId
        .mockResolvedValueOnce({     // match on email
          id: 'u2', email: IDENTITY.email, username: 'nelly',
          password: 'hash', displayName: 'Nelly', googleId: null,
        });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refuses to link when Google has not verified the address', async () => {
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });
      prisma.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'u3', email: IDENTITY.email, username: 'nelly',
          password: 'hash', displayName: 'Nelly', googleId: null,
        });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a pending account when nothing matches', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'u4', ...data }),
      );

      const result = await service.loginWithGoogle('token');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          googleId: IDENTITY.googleId,
          email: IDENTITY.email,
          displayName: IDENTITY.displayName,
          username: null,
          password: null,
        },
      });
      expect(result.user.username).toBeNull();
    });
  });
```

Add `ConflictException` to the `@nestjs/common` import at the top of the spec file.

- [ ] **Step 3: Run them and watch them fail**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: FAIL — `service.loginWithGoogle is not a function`.

- [ ] **Step 4: Implement the resolution**

Add to `backend/src/auth/auth.service.ts`:

```typescript
  async loginWithGoogle(idToken: string) {
    const identity = await this.googleVerifier.verify(idToken);

    const linked = await this.prisma.user.findFirst({
      where: { googleId: identity.googleId },
    });
    if (linked) {
      return this.session(linked);
    }

    // Matched case-insensitively: register stores the address verbatim, so an
    // account created as Nelly@Example.com must still be found here. Matching
    // more broadly is the safe direction now that a match means refusal.
    const sameEmail = await this.prisma.user.findFirst({
      where: { email: { equals: identity.email, mode: 'insensitive' } },
    });
    if (sameEmail) {
      // No linking, deliberately. Tambouille never proves that an account's
      // address belongs to whoever registered it, so attaching a Google identity
      // to an existing row would hand the real owner's session to whoever
      // registered that address first — and leave them password access to it.
      // Revisit only alongside email verification, as a deliberate decision.
      throw new ConflictException(
        'An account already uses this email address. Sign in with your password instead.',
      );
    }

    // Creating on an unverified address would let anyone squat someone else's
    // address, which is the same attack from the other end.
    if (!identity.emailVerified) {
      throw new ConflictException(
        'Google has not verified this email address. Sign in with your password instead.',
      );
    }

    const created = await this.prisma.user.create({
      data: {
        googleId: identity.googleId,
        email: identity.email,
        displayName: identity.displayName,
        username: null,
        password: null,
      },
    });
    return this.session(created);
  }
```

Add `ConflictException` to the `@nestjs/common` import if absent, and factor the repeated tail of `register`/`login` into a helper placed just below `issueToken`:

```typescript
  private async session(user: Parameters<AuthService['toPublicUser']>[0]) {
    const accessToken = await this.issueToken(user.id);
    return { accessToken, user: this.toPublicUser(user) };
  }
```

Then widen `toPublicUser`'s parameter type so `username` is `string | null`, and use `session(user)` in `register` and `login` instead of their duplicated last two lines.

- [ ] **Step 5: Run and watch them pass**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Implement the real verifier**

Replace the body of `backend/src/auth/google-token-verifier.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/** What the application needs out of a verified Google ID token. */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

@Injectable()
export class GoogleTokenVerifier {
  private client?: OAuth2Client;

  constructor(private readonly config: ConfigService) {}

  /**
   * The client id is read on first use, not in the constructor. Reading it
   * eagerly would take the entire API down at boot whenever the variable is
   * missing — the failure mode that broke production on 2026-08-08. Here, a
   * missing id only breaks Google sign-in.
   */
  private getClient(): OAuth2Client {
    if (!this.client) {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId) {
        throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
      }
      this.client = new OAuth2Client(clientId);
    }
    return this.client;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    let payload;
    try {
      // Checks Google's signature, the issuer, the expiry, and that the token
      // was minted for this application rather than another one.
      const ticket = await this.getClient().verifyIdToken({ idToken, audience: clientId! });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      displayName: payload.name ?? payload.email.split('@')[0]!,
    };
  }
}
```

- [ ] **Step 7: Confirm nothing regressed**

```bash
cd backend && npm test && npm run build
```

Expected: all tests pass, build exits 0.

- [ ] **Step 8: Commit**

```bash
git add backend/src/auth backend/package.json backend/package-lock.json
git commit -m "feat(auth): resolve or create an account from a Google ID token

Refuses when the address already has an account; creates one only when Google
reports the address verified.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Expose `POST /api/auth/google`

**Files:**
- Create: `backend/src/auth/dto/google-login.dto.ts`
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/src/auth/auth.module.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `AuthService.loginWithGoogle` from Task 3.
- Produces: `POST /api/auth/google` returning `{ accessToken, user }`, consumed by Task 7.

- [ ] **Step 1: Create the DTO**

Create `backend/src/auth/dto/google-login.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
```

- [ ] **Step 2: Add the route**

In `backend/src/auth/auth.controller.ts`, import the DTO and add below `login`:

```typescript
  @Post('google')
  @HttpCode(HttpStatus.OK)
  google(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }
```

- [ ] **Step 3: Register the provider**

In `backend/src/auth/auth.module.ts`, import `GoogleTokenVerifier` and add it to `providers`:

```typescript
  providers: [AuthService, JwtStrategy, GoogleTokenVerifier],
```

- [ ] **Step 4: Document the variable**

Append to `backend/.env.example`:

```
# Identifiant client OAuth public, console Google Cloud. Pas de secret pour ce flux.
GOOGLE_CLIENT_ID="changeme.apps.googleusercontent.com"
```

Then add the real value to `backend/.env` (not committed).

- [ ] **Step 5: Verify against the running API**

Start the backend, then:

```bash
curl -s -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/auth/google -H "Content-Type: application/json" -d '{"idToken":"not-a-real-token"}'
```

Expected: `STATUS:401` with `Invalid Google token`. This proves the route exists, validation passes, and the verifier rejects a forged token — the only case testable without a real Google sign-in.

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth backend/.env.example
git commit -m "feat(auth): add POST /api/auth/google

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Let a pending account choose its username

**Files:**
- Create: `backend/src/auth/dto/set-username.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`, `auth.service.spec.ts`, `auth.controller.ts`

**Interfaces:**
- Produces: `AuthService.setUsername(userId: string, username: string)` and `POST /api/auth/username`, consumed by Task 8.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('AuthService')` in the spec:

```typescript
  describe('setUsername', () => {
    it('sets the username when the account has none', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: null });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        id: 'u1', email: 'n@e.com', username: 'nelly',
        password: null, displayName: 'Nelly', bio: null, avatarUrl: null,
        createdAt: new Date(),
      });

      const user = await service.setUsername('u1', 'nelly');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { username: 'nelly' },
      });
      expect(user.username).toBe('nelly');
    });

    it('refuses to overwrite a username that is already set', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'nelly' });

      await expect(service.setUsername('u1', 'autre')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses a username already taken by someone else', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', username: 'nelly' });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run and watch them fail**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: FAIL — `service.setUsername is not a function`.

- [ ] **Step 3: Implement**

Add to `AuthService`:

```typescript
  async setUsername(userId: string, username: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // One-shot: this endpoint exists to complete a pending account, not to
    // rename an established one, which would break every link to its profile.
    if (user.username) {
      throw new ConflictException('Username already set');
    }

    const taken = await this.prisma.user.findFirst({ where: { username } });
    if (taken) {
      throw new ConflictException('Username already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { username },
    });
    return this.toPublicUser(updated);
  }
```

> **Amended after review.** The write above is check-then-act: two concurrent
> claims both read `username === null`, both write, and the caller whose write
> lost still receives a 200 describing a handle that is not the one persisted.
> What shipped writes conditionally with
> `updateMany({ where: { id: userId, username: null }, data: { username } })`,
> treats `count === 0` as `ConflictException`, and catches Prisma's `P2002` so a
> cross-user collision surfaces as 409 rather than an unhandled 500. The
> pre-checks stay, but only for friendly error messages — the constraint and the
> conditional write are what actually guarantee correctness. See
> `backend/src/auth/auth.service.ts` for the shipped version.

The tests mock `findUnique`; `findUniqueOrThrow` resolves through the same mock name only if it exists on the mock. Add `findUniqueOrThrow: jest.fn()` to `createPrismaMock().user` and use it in the three tests above instead of `findUnique`.

- [ ] **Step 4: Run and watch them pass**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Add the DTO and route**

Create `backend/src/auth/dto/set-username.dto.ts`:

```typescript
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SetUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username may only contain letters, numbers, underscores, dots and dashes',
  })
  username!: string;
}
```

In `auth.controller.ts`:

```typescript
  @Post('username')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setUsername(@CurrentUserId() userId: string, @Body() dto: SetUsernameDto) {
    return this.authService.setUsername(userId, dto.username);
  }
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth
git commit -m "feat(auth): let a pending account choose its username

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Let a Google account add a password

**Files:**
- Create: `backend/src/auth/dto/set-password.dto.ts`
- Modify: `backend/src/auth/auth.service.ts`, `auth.service.spec.ts`, `auth.controller.ts`

**Interfaces:**
- Produces: `AuthService.setPassword(userId: string, password: string)` and `POST /api/auth/password`, consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('AuthService')`:

```typescript
  describe('setPassword', () => {
    it('hashes and stores a password on an account that has none', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', password: null });
      prisma.user.update.mockResolvedValue({
        id: 'u1', email: 'n@e.com', username: 'nelly',
        password: 'hashed', displayName: 'Nelly', bio: null, avatarUrl: null,
        createdAt: new Date(),
      });

      await service.setPassword('u1', 'motdepasse123');

      const call = prisma.user.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'u1' });
      // Stored hashed, never in clear.
      expect(call.data.password).not.toBe('motdepasse123');
      expect(call.data.password).toMatch(/^\$2[aby]\$/);
    });

    it('refuses when a password is already set', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', password: 'existing-hash' });

      await expect(service.setPassword('u1', 'motdepasse123')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run and watch them fail**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: FAIL — `service.setPassword is not a function`.

- [ ] **Step 3: Implement**

```typescript
  async setPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // Replacing an existing password would require proving ownership of the
    // current one. That is a separate feature; this endpoint only fills a gap.
    if (user.password) {
      throw new ConflictException('Password already set');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
    return this.toPublicUser(updated);
  }
```

> **Amended after review.** Same flaw as `setUsername` above, and the same fix:
> what shipped writes conditionally with
> `updateMany({ where: { id: userId, password: null }, data: { password: passwordHash } })`
> and treats `count === 0` as `ConflictException`. No `P2002` handling is needed
> here — `password` carries no unique constraint. See
> `backend/src/auth/auth.service.ts` for the shipped version.

- [ ] **Step 4: Run and watch them pass**

```bash
cd backend && npm test -- auth.service.spec
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Add the DTO and route**

Create `backend/src/auth/dto/set-password.dto.ts`:

```typescript
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
```

In `auth.controller.ts`:

```typescript
  @Post('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  setPassword(@CurrentUserId() userId: string, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(userId, dto.password);
  }
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth
git commit -m "feat(auth): let a Google account define a password

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: The Google button

**Files:**
- Create: `frontend/src/components/GoogleSignInButton.vue`
- Modify: `frontend/src/stores/auth.ts`, `frontend/src/views/LoginView.vue`, `frontend/src/views/RegisterView.vue`, `frontend/index.html`, `frontend/.env.example`

**Interfaces:**
- Consumes: `POST /api/auth/google` from Task 4.
- Produces: `authStore.loginWithGoogle(idToken)`, and a `<GoogleSignInButton>` emitting nothing — it drives the store itself.

- [ ] **Step 1: Load Google's script**

In `frontend/index.html`, inside `<head>`:

```html
    <script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 2: Declare the variable**

Append to `frontend/.env.example`:

```
VITE_GOOGLE_CLIENT_ID=changeme.apps.googleusercontent.com
```

and the real value to `frontend/.env`.

- [ ] **Step 3: Add the store action**

In `frontend/src/stores/auth.ts`, inside `actions`, next to `login`:

```typescript
    async loginWithGoogle(idToken: string) {
      const { data } = await apiClient.post('/auth/google', { idToken })
      this.setSession(data)
    },
```

- [ ] **Step 4: Create the component**

Create `frontend/src/components/GoogleSignInButton.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const container = ref<HTMLElement | null>(null)
const error = ref('')

async function handleCredential(response: { credential: string }) {
  error.value = ''
  try {
    await authStore.loginWithGoogle(response.credential)
    // A Google-created account has no username yet; the router guard added in
    // Task 8 sends it to the selection screen from here.
    router.push({ name: 'discover' })
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ?? 'La connexion avec Google a échoué. Réessaie.'
  }
}

onMounted(() => {
  const google = (window as any).google
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!google || !clientId || !container.value) return

  google.accounts.id.initialize({ client_id: clientId, callback: handleCredential })
  google.accounts.id.renderButton(container.value, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    locale: 'fr',
  })
})
</script>

<template>
  <div>
    <div ref="container"></div>
    <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
  </div>
</template>
```

- [ ] **Step 5: Place it in both views**

In `LoginView.vue` and `RegisterView.vue`, import the component and render it below the existing form, separated by a divider:

```vue
    <div class="my-4 flex items-center gap-3 text-xs text-tambouille-muted">
      <span class="h-px flex-1 bg-tambouille-border"></span>
      ou
      <span class="h-px flex-1 bg-tambouille-border"></span>
    </div>
    <GoogleSignInButton />
```

- [ ] **Step 6: Verify in the browser**

Run the frontend, open `http://localhost:5173/login`, confirm the Google button renders. Sign in with a Google account whose address is not yet in the database. Expected: you land signed in, and `GET /api/auth/me` returns a user whose `username` is `null`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src frontend/index.html frontend/.env.example
git commit -m "feat(auth): add the Google sign-in button

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The username selection screen

**Files:**
- Create: `frontend/src/views/ChooseUsernameView.vue`
- Modify: `frontend/src/stores/auth.ts`, `frontend/src/router/index.ts`

**Interfaces:**
- Consumes: `POST /api/auth/username` from Task 5.
- Produces: the route named `choose-username`, and the guard that makes it unskippable.

- [ ] **Step 1: Add the store action**

In `frontend/src/stores/auth.ts`:

```typescript
    async setUsername(username: string) {
      const { data } = await apiClient.post('/auth/username', { username })
      this.user = data
    },
```

- [ ] **Step 2: Create the view**

Create `frontend/src/views/ChooseUsernameView.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await authStore.setUsername(username.value.trim())
    router.push({ name: 'discover' })
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Ce pseudo est indisponible.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="mb-2 text-2xl font-bold">Choisis ton pseudo</h1>
    <p class="mb-6 text-sm text-tambouille-muted">
      C'est le nom sous lequel les autres te trouveront. Tu ne pourras plus le changer.
    </p>

    <form @submit.prevent="submit">
      <input
        v-model="username"
        type="text"
        required
        minlength="3"
        maxlength="30"
        pattern="[a-zA-Z0-9_.\-]+"
        placeholder="djnelly"
        class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-4 py-2"
      />
      <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
      <button
        type="submit"
        :disabled="submitting"
        class="mt-4 w-full rounded-lg bg-tambouille-accent px-4 py-2 font-semibold disabled:opacity-50"
      >
        {{ submitting ? 'Un instant…' : 'Continuer' }}
      </button>
    </form>
  </div>
</template>
```

- [ ] **Step 3: Register the route**

In `frontend/src/router/index.ts`, inside `routes`:

```typescript
    {
      path: '/bienvenue',
      name: 'choose-username',
      component: () => import('@/views/ChooseUsernameView.vue'),
      meta: { requiresAuth: true },
    },
```

- [ ] **Step 4: Make it unskippable**

Replace the body of `router.beforeEach` with:

```typescript
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'discover' }
  }

  // An account created through Google has no username until it picks one.
  // Nothing else is reachable until then: without a handle it has no public
  // profile, and its uploads could not be attributed.
  if (
    authStore.isAuthenticated &&
    authStore.user &&
    !authStore.user.username &&
    to.name !== 'choose-username'
  ) {
    return { name: 'choose-username' }
  }
})
```

- [ ] **Step 5: Verify in the browser**

Sign in with the Google account created in Task 7. Expected: you are redirected to `/bienvenue`; navigating manually to `/` sends you straight back; submitting a valid pseudo lets you through and your profile is reachable at `/users/<pseudo>`. Submitting a pseudo that already exists shows the error without leaving the page.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(auth): add the username selection screen for Google accounts

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Adding a password from the profile

**Files:**
- Modify: `frontend/src/stores/auth.ts`, `frontend/src/views/ProfileView.vue`
- Modify: `backend/src/auth/auth.service.ts` (Step 2 adds `hasPassword` to the public user shape)

**Interfaces:**
- Consumes: `POST /api/auth/password` from Task 6.
- Produces: `hasPassword: boolean` on every `{ user }` payload the API returns.

`ProfileView.vue` is 16 KB and already handles editing. Add the section inside its existing "own profile" branch rather than creating a parallel settings page.

- [ ] **Step 1: Add the store action**

```typescript
    async setPassword(password: string) {
      const { data } = await apiClient.post('/auth/password', { password })
      this.user = data
    },
```

- [ ] **Step 2: Expose whether a password exists**

`toPublicUser` deliberately never returns the password or its hash. So the frontend cannot tell whether one is set. Add a boolean to the public shape in `backend/src/auth/auth.service.ts`:

```typescript
      hasPassword: user.password !== null,
```

and widen `toPublicUser`'s parameter type to include `password: string | null`. This exposes only whether a password exists, never anything derived from it.

- [ ] **Step 3: Add the section**

In `ProfileView.vue`, within the block shown only on one's own profile:

```vue
      <section v-if="authStore.user && !authStore.user.hasPassword" class="mt-8">
        <h2 class="mb-2 text-lg font-semibold">Définir un mot de passe</h2>
        <p class="mb-3 text-sm text-tambouille-muted">
          Ton compte se connecte avec Google. Un mot de passe te donnera un second
          moyen d'accès si tu perds ce compte Google.
        </p>
        <form class="flex gap-2" @submit.prevent="submitPassword">
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            maxlength="72"
            class="flex-1 rounded-lg border border-tambouille-border bg-tambouille-surface px-4 py-2"
          />
          <button type="submit" class="rounded-lg bg-tambouille-accent px-4 py-2 font-semibold">
            Enregistrer
          </button>
        </form>
        <p v-if="passwordError" class="mt-2 text-sm text-red-500">{{ passwordError }}</p>
        <p v-if="passwordSaved" class="mt-2 text-sm text-green-600">Mot de passe enregistré.</p>
      </section>
```

with, in the `<script setup>`:

```typescript
const newPassword = ref('')
const passwordError = ref('')
const passwordSaved = ref(false)

async function submitPassword() {
  passwordError.value = ''
  passwordSaved.value = false
  try {
    await authStore.setPassword(newPassword.value)
    newPassword.value = ''
    passwordSaved.value = true
  } catch (e: any) {
    passwordError.value = e?.response?.data?.message ?? 'Enregistrement impossible.'
  }
}
```

- [ ] **Step 4: Verify end to end**

On the Google account from Task 8, open your own profile. Expected: the section appears. Submit a password of at least 8 characters, then sign out and sign back in **with the password** using the same email address. Expected: it works, and the section has disappeared from the profile.

- [ ] **Step 5: Run the whole backend suite once more**

```bash
cd backend && npm test && npm run build
```

Expected: 10 tests pass, build exits 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src backend/src/auth
git commit -m "feat(auth): let a Google account add a password from its profile

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Deployment note

This adds one environment variable on each side. On o2switch, `GOOGLE_CLIENT_ID` goes into `~/tambouille/backend/.env`, and the frontend must be rebuilt with `VITE_GOOGLE_CLIENT_ID` set, since Vite bakes it in at build time. The Google Cloud OAuth client must list `https://tambouille.pantagruweb.club` among its authorised JavaScript origins, or the button will refuse to render in production while working locally.
