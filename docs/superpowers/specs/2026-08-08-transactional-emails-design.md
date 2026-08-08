# Transactional emails — design

**Date:** 2026-08-08
**Status:** Draft, awaiting user review

## Context

Tambouille (Vue 3 + NestJS + PostgreSQL) has no email capability at all today: no mail transport, no `emailVerified` field, no reset token. A user who forgets their password has no way back into their account — the only recovery path is a manual database edit.

This project adds the smallest amount of email infrastructure that solves that: SMTP sending via nodemailer, plus a stateless password-reset flow. It is deliberately scoped to **password reset only**. Other transactional emails (address verification, welcome, social notifications) are out of scope and are expected to reuse the `MailService` introduced here when they are built.

The sending domain is `pantagruweb.club`, managed on Cloudflare — DNS records for whichever SMTP relay is chosen (SPF, DKIM) are added there.

## Scope

In scope:

- A `MailModule` / `MailService` wrapping a nodemailer SMTP transport, configured entirely from environment variables so any relay (Brevo, Mailgun, SES, …) works without code changes.
- `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`.
- A stateless, self-invalidating reset token — no new table, no migration, no cleanup job.
- Rate limiting on `forgot-password` via `@nestjs/throttler`.
- Two frontend views (`/forgot-password`, `/reset-password`) and a "Mot de passe oublié ?" link on the login page.
- A Mailpit service in `docker-compose.yml` so local development uses real SMTP with no dev/prod branching in the code.

Out of scope (deferred):

- Email address verification at registration, welcome emails, social notification emails (new comment, new follower).
- HTML email templating engine — one email does not justify one.
- Queueing / retry of failed sends. Sending is synchronous inside the request; a transport failure is logged and the endpoint still returns 204. The user can request another email.
- Changing the existing login/register flows, or the `User` model.

## Architecture

### `MailModule` (`backend/src/mail/`)

A global module exporting `MailService`. The service builds one nodemailer transport at construction time from `ConfigService`:

| Variable | Example | Notes |
|---|---|---|
| `SMTP_HOST` | `localhost` | Mailpit in dev, the relay's host in prod |
| `SMTP_PORT` | `1025` | `587` for most relays |
| `SMTP_SECURE` | `false` | `true` only for implicit TLS (port 465) |
| `SMTP_USER` | — | empty in dev (Mailpit needs no auth) |
| `SMTP_PASS` | — | empty in dev |
| `MAIL_FROM` | `Tambouille <no-reply@pantagruweb.club>` | |

When `SMTP_USER` is empty, no `auth` object is passed to nodemailer — that is what lets Mailpit work unauthenticated with the same code path as an authenticated relay.

One public method:

```ts
sendPasswordReset(to: string, resetUrl: string): Promise<void>
```

It builds a plain-text body and a minimal HTML body inline (no template engine), sends, and on failure logs the error via Nest's `Logger` and resolves anyway. Callers never learn whether delivery succeeded — see the enumeration note below.

### Reset token — `PasswordResetTokenService` (`backend/src/auth/`)

A JWT signed with a **derived key**: `JWT_SECRET + user.password` (the bcrypt hash). Payload `{ sub: userId }`, `expiresIn: '1h'`. `@nestjs/jwt` accepts a per-call `secret` override, so this needs no new dependency and does not touch the globally-registered `JwtModule` config used by login.

```ts
issue(user):   jwtService.signAsync({ sub: user.id }, { secret: key(user), expiresIn: '1h' })
verify(token): decode(token) → sub → load user → jwtService.verifyAsync(token, { secret: key(user) })
```

`decode` is used only to find which user to load. It grants nothing: the returned user is discarded unless `verifyAsync` then succeeds against that user's derived key.

Because the key contains the current password hash, changing the password changes the key, which invalidates every token issued before the change. That gives single-use semantics for free.

Known ceiling, accepted: individual tokens cannot be revoked, and if a user requests several resets without completing one, all of those tokens stay valid until the first is used or the hour elapses. Upgrade path if that ever matters: a `PasswordResetToken` table with `tokenHash` / `expiresAt` / `usedAt`.

### Endpoints (`AuthController`)

| Route | Body | Success | Failure |
|---|---|---|---|
| `POST /api/auth/forgot-password` | `{ email }` | `204` | `204` |
| `POST /api/auth/reset-password` | `{ token, password }` | `204` | `400` invalid or expired token |

`forgot-password` returns `204` unconditionally — unknown address, known address, or SMTP failure all look identical from outside. Anything else turns the endpoint into an account-existence oracle. When the address does match a user, the service issues a token and calls `sendPasswordReset` with `${FRONTEND_URL}/reset-password?token=…` (`FRONTEND_URL` is already configured).

`reset-password` verifies the token, hashes the new password with the existing `SALT_ROUNDS = 12`, and updates the user. It returns `204` — no access token. The user then logs in normally, which also confirms the new password works.

DTOs follow the existing `class-validator` pattern in `backend/src/auth/dto/`: `ForgotPasswordDto` (`@IsEmail()`), `ResetPasswordDto` (`@IsString() @IsNotEmpty()` token, password with the same rules `RegisterDto` already applies).

### Rate limiting

`@nestjs/throttler` is registered in `AppModule` with no global guard, and applied as a route-level guard with `@Throttle({ default: { limit: 5, ttl: 900_000 } })` on `forgot-password` only. Every other route keeps its current behaviour. Without this, the endpoint is an open relay for mail-bombing any address.

This and `nodemailer` (+ `@types/nodemailer`) are the only new backend dependencies.

## Frontend

- `LoginView.vue`: a "Mot de passe oublié ?" link under the form, pointing to `/forgot-password`.
- `ForgotPasswordView.vue` — route `/forgot-password`, `meta: { guestOnly: true }`. One email field. On submit, always shows the same neutral confirmation: « Si un compte existe pour cette adresse, un email a été envoyé. »
- `ResetPasswordView.vue` — route `/reset-password`, `meta: { guestOnly: true }`, token read from `route.query.token`. Two fields (new password, confirmation) validated client-side for equality. On success, redirects to `/login`. On `400`, shows an error inviting the user to request a new link.
- Both views follow the existing form markup and Tailwind classes of `LoginView.vue`, and call the API through the existing axios client in `frontend/src/api/`.
- No Pinia store: neither view touches auth state.

## Local development

`docker-compose.yml` gains a `mailpit` service (`axllent/mailpit`, SMTP on `1025`, web UI on `8025`). `backend/.env.example` points at it with empty credentials. Local and production therefore run the exact same code path — real SMTP on both sides, only the environment differs. There is no fake or console transport to keep in sync.

## Testing

One spec file, `backend/src/auth/password-reset.spec.ts`, covering the token logic — the part that fails silently and dangerously if it breaks:

1. A freshly issued token verifies and returns the right user id.
2. A token issued before a password change is rejected after the change.
3. An expired token is rejected.
4. A token signed with a different secret is rejected.
5. A token whose `sub` refers to a non-existent user is rejected.

Prisma is stubbed with an in-memory fake user; `MailService` is mocked. No test performs a real SMTP send.

## Rollout

1. Pick an SMTP relay, add its SPF/DKIM records to `pantagruweb.club` in Cloudflare, verify the domain.
2. Set the `SMTP_*` and `MAIL_FROM` variables in the backend's production environment.
3. Deploy. Nothing to migrate — no schema change.
