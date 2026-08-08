# Transactional emails — design

**Date:** 2026-08-08
**Status:** Reviewed (`/plan-eng-review`, 7 findings folded in), ready for implementation planning

## Context

Tambouille (Vue 3 + NestJS + PostgreSQL) cannot send email at all today: no transport, no configuration, no dependency. Every feature that needs to reach a user outside the app — password reset, address verification, notifications — is blocked on the same missing piece.

This spec covers **that piece only**: the ability to send an email. It introduces a `MailService` and the environment plumbing behind it. It deliberately ships no feature that *uses* it — the first consumer (password reset) is a separate spec, written next, and it will not need to touch this code.

The sending domain is `pantagruweb.club`, managed on Cloudflare — DNS records for whichever SMTP relay is chosen (SPF, DKIM) are added there.

## Scope

In scope:

- A `MailModule` / `MailService` wrapping a nodemailer SMTP transport.
- Configuration entirely from environment variables, so any relay (Brevo, Mailgun, SES, …) works without code changes, and `backend/.env.example` documenting them.
- Startup verification of the SMTP connection, non-blocking.
- A `npm run mail:test` CLI so a send can actually be triggered, locally and against production.
- A Mailpit service in `docker-compose.yml`, so local development sends over real SMTP and the code has no dev/prod branching.
- Failure handling: a send that fails is logged and reported to the caller, and never crashes it.

Out of scope — every one of these is a *consumer* of this service, not part of it:

- Password reset: `forgot-password` / `reset-password` endpoints, reset tokens, the frontend views, rate limiting on those routes. **Next spec.**
- Email address verification at registration, welcome emails, social notification emails.
- HTML templating engine. Callers pass the body they want; one engine for zero emails is premature.
- Queueing, retry, or scheduled delivery. Sending is a direct `await` inside whatever request calls it, bounded by the timeouts below.
- A global environment-variable validation schema. `MAIL_FROM` is checked here; the rest of the app's config is a separate concern, tracked in `TODOS.md`.
- SMTP connection pooling (`pool: true`). At Tambouille's volume a fresh connection per send costs less than holding one open.
- Bounce/complaint handling, delivery tracking, unsubscribe management.
- Any change to the `User` model, the auth flows, or the frontend.

## Architecture

```
  ConfigService                MailService                        SMTP
  ─────────────                ───────────                        ────
  SMTP_HOST ──┐
  SMTP_PORT ──┼─> Number()  ──┐
  SMTP_SECURE─┼─> === 'true' ─┼─> createTransport({..., timeouts})
  SMTP_USER ──┼─> vide ? pas d'auth
  SMTP_PASS ──┘               │
  MAIL_FROM ──> absent ? throw au démarrage
                              │
                        onModuleInit()
                              └─> verify() ──────────────────────> relais
                                    ├── ok   -> log info
                                    └── échec-> log error, ON DÉMARRE QUAND MÊME
                              │
                  send({to,subject,text,html?}) : Promise<boolean>
                              │
                        sendMail() ──────────────────────────────> relais
                              ├── ok    -> true
                              └── échec -> log (adresse masquée) -> false
```

### `MailModule` (`backend/src/mail/`)

A global module (`@Global()`) exporting `MailService`, imported once in `AppModule`. Global because every future feature module will need it and none of them should have to re-import it. This mirrors `PrismaModule` (`backend/src/prisma/prisma.module.ts`), which is the same shape.

`MailService` builds one nodemailer transport at construction time from `ConfigService`:

| Variable | Dev value | Read as | Notes |
|---|---|---|---|
| `SMTP_HOST` | `localhost` | string | the relay's host in production |
| `SMTP_PORT` | `1025` | **`Number(...)`** | nodemailer wants a number, env gives a string |
| `SMTP_SECURE` | `false` | **`=== 'true'`** | the string `"false"` is truthy; comparing explicitly is the whole fix |
| `SMTP_USER` | *(empty)* | string | Mailpit needs no auth |
| `SMTP_PASS` | *(empty)* | string | |
| `MAIL_FROM` | `Tambouille <no-reply@pantagruweb.club>` | string, **required** | constructor throws if empty |

When `SMTP_USER` is empty, no `auth` object is passed to nodemailer. That single conditional is what lets unauthenticated Mailpit and an authenticated production relay run the exact same code path.

The transport also sets explicit timeouts: `connectionTimeout: 5000`, `greetingTimeout: 5000`, `socketTimeout: 10000`. Nodemailer's defaults (2 min / 30 s / 10 min) would let a hung relay hold an HTTP request open for minutes, since sends are awaited inside the request. These bounds also apply to `verify()`, which shares the transport.

`MAIL_FROM` is required at construction rather than at send time because a missing `from` is not something `verify()` can catch — it tests the connection, not the envelope — and the service is otherwise designed to swallow send failures.

### Startup verification

`MailService` implements `OnModuleInit`. It calls `transporter.verify()`, which opens the connection and authenticates.

- Success: one info log.
- Failure: a loud `logger.error`, **and the application starts anyway.**

Non-blocking is deliberate. `createTransport()` is lazy — it opens no connection — so without this check a typo in `SMTP_HOST` stays invisible until the first real send, which `send()` then swallows. Verifying at boot is the only place a misconfiguration surfaces before a user is affected. But making it fatal would couple the whole API's availability to the relay's: a relay outage during a redeploy would keep Tambouille down, even though playing mixes has nothing to do with email. It would also break `backend/test/app.e2e-spec.ts`, which calls `app.init()` and therefore runs this hook.

### Public API

One method:

```ts
send(options: { to: string; subject: string; text: string; html?: string }): Promise<boolean>
```

`from` is filled in from `MAIL_FROM`; callers never pass it. `text` is required and `html` optional, so a caller cannot accidentally send an HTML-only email that renders as blank in a text client.

**It never throws.** A transport error is caught, logged, and reported as `false`. Rationale: the caller is an HTTP request handler, and a relay outage should not turn every consumer into a 500 just because someone forgot a `try/catch`. Returning a boolean rather than `void` keeps the outcome available to callers that legitimately need it — a "resend verification email" button on an authenticated user has no enumeration concern and should be able to say "couldn't send, try again". Consumers that don't care ignore the return value.

Failure logs record the **subject and the recipient's domain, not the full address** (`***@gmail.com`). The domain is what actually helps diagnosis ("everything to outlook.com is failing"); the individual's identity adds nothing and would put personal data into a log stream whose lifetime and distribution the app does not control.

`nodemailer` and `@types/nodemailer` are the only new dependencies.

### `npm run mail:test`

A small CLI at `backend/src/mail/mail-test.ts`, run as `npm run mail:test -- someone@example.com`. It calls `NestFactory.createApplicationContext(AppModule)` to boot the DI container with no HTTP server, resolves `MailService`, sends one message, prints the result, and exits 0 on `true` / 1 on `false`. Missing argument prints usage and exits 1.

Without it nothing in this spec ever reaches `sendMail()`, the rollout steps below would not be executable, and the first real execution of this network code would be on the request path of a user who lost their password. It doubles as a permanent diagnostic when someone reports missing email. A CLI rather than a dev-only HTTP endpoint: an endpoint that mails an arbitrary caller-supplied address is an open relay the day its environment guard is wrong.

## Local development

`docker-compose.yml` gains a `mailpit` service (`axllent/mailpit`, SMTP on `1025`, web UI on `8025`) alongside the existing `postgres`. `backend/.env.example` points at it with empty credentials.

Local and production run identical code — real SMTP on both sides, only the environment differs. There is no fake, console, or JSON transport to keep in sync with the real one.

## Testing

Jest, matching the existing convention: unit specs next to the code with hand-rolled mocks (see `backend/src/comments/comments.service.spec.ts`), no `Test.createTestingModule`.

`backend/src/mail/mail.service.spec.ts`, nodemailer mocked. Every path below fails *silently* if it breaks, which is why each one is covered:

**Constructor**
1. `SMTP_USER` set → transport options carry an `auth` object.
2. `SMTP_USER` empty → no `auth` key at all.
3. `SMTP_SECURE="false"` → `secure` is the boolean `false`.
4. `SMTP_SECURE="true"` → `secure` is the boolean `true`.
5. `SMTP_PORT="1025"` → `port` is the number `1025`.
6. `MAIL_FROM` missing → constructor throws.

**`onModuleInit`**

7. `verify()` resolves → info logged, no throw.
8. `verify()` rejects → error logged, **still no throw**.

**`send`**

9. `sendMail` resolves → returns `true`.
10. `sendMail` rejects → returns `false`, logs.
11. `from` is taken from `MAIL_FROM`.
12. `html` omitted → field absent, `text` preserved.
13. Failure log masks the address local-part.

**`backend/test/mail-boot.e2e-spec.ts` — regression, required.** `AppModule` compiles and `app.init()` resolves with `SMTP_HOST` pointed at an unreachable address. This is the exact guarantee the non-blocking choice above exists to provide, and `app.e2e-spec.ts` already exercises `app.init()`, so a fatal `verify()` would take the whole e2e suite down with it.

The three `mail:test` paths (address given, argument missing, send failed) are verified by hand. It is a CLI entry point; mocking it would prove nothing.

No test performs a real SMTP send.

## Rollout

1. `docker compose up -d` starts Mailpit. Run `npm run mail:test -- dev@example.com` and confirm the message appears at `localhost:8025`.
2. Production sends through **Gmail**, because Cloudflare's free tier does not allow outbound mail. In the Google account: turn on 2-Step Verification, then create an app password at `myaccount.google.com/apppasswords`. The account password is refused.
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=<the Gmail address>`, `SMTP_PASSWORD=<the app password>`, and `SMTP_FROM` in the backend's production environment.
4. Deploy, then run `npm run mail:test -- <your address>` against production to smoke-test the real relay without mailing a real user.

Two Gmail constraints worth knowing before step 3. `SMTP_FROM` has to be the Gmail address: Gmail rewrites a sender that does not match the account, so `no-reply@pantagruweb.club` only survives if it is registered and verified under *Settings > Accounts > Send mail as*. And a free account is capped at 500 recipients per day, which is ample for password resets and would not be if the site ever mails anything else.

No SPF or DKIM records are needed on `pantagruweb.club` for this: mail leaves as the Gmail address, under Google's own authentication. That changes only if the domain alias in *Send mail as* is set up.

No schema change and no migration.
