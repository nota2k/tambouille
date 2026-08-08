# Transactional emails — design

**Date:** 2026-08-08
**Status:** Draft, awaiting user review

## Context

Tambouille (Vue 3 + NestJS + PostgreSQL) cannot send email at all today: no transport, no configuration, no dependency. Every feature that needs to reach a user outside the app — password reset, address verification, notifications — is blocked on the same missing piece.

This spec covers **that piece only**: the ability to send an email. It introduces a `MailService` and the environment plumbing behind it. It deliberately ships no feature that *uses* it — the first consumer (password reset) is a separate spec, written next, and it will not need to touch this code.

The sending domain is `pantagruweb.club`, managed on Cloudflare — DNS records for whichever SMTP relay is chosen (SPF, DKIM) are added there.

## Scope

In scope:

- A `MailModule` / `MailService` wrapping a nodemailer SMTP transport.
- Configuration entirely from environment variables, so any relay (Brevo, Mailgun, SES, …) works without code changes, and `backend/.env.example` documenting them.
- A Mailpit service in `docker-compose.yml`, so local development sends over real SMTP and the code has no dev/prod branching.
- Failure handling: a send that fails is logged, never crashes the caller.

Out of scope — every one of these is a *consumer* of this service, not part of it:

- Password reset: `forgot-password` / `reset-password` endpoints, reset tokens, the frontend views, rate limiting on those routes. **Next spec.**
- Email address verification at registration, welcome emails, social notification emails.
- HTML templating engine. Callers pass the body they want; one engine for zero emails is premature.
- Queueing, retry, or scheduled delivery. Sending is a direct `await` inside whatever request calls it.
- Bounce/complaint handling, delivery tracking, unsubscribe management.
- Any change to the `User` model, the auth flows, or the frontend.

## Architecture

### `MailModule` (`backend/src/mail/`)

A global module (`@Global()`) exporting `MailService`, imported once in `AppModule`. Global because every future feature module will need it and none of them should have to re-import it.

`MailService` builds one nodemailer transport at construction time from `ConfigService`:

| Variable | Dev value | Notes |
|---|---|---|
| `SMTP_HOST` | `localhost` | the relay's host in production |
| `SMTP_PORT` | `1025` | `587` for most relays |
| `SMTP_SECURE` | `false` | `true` only for implicit TLS (port 465) |
| `SMTP_USER` | *(empty)* | Mailpit needs no auth |
| `SMTP_PASS` | *(empty)* | |
| `MAIL_FROM` | `Tambouille <no-reply@pantagruweb.club>` | default `from` for every send |

When `SMTP_USER` is empty, no `auth` object is passed to nodemailer. That single conditional is what lets unauthenticated Mailpit and an authenticated production relay run the exact same code path.

### Public API

One method:

```ts
send(options: { to: string; subject: string; text: string; html?: string }): Promise<void>
```

`from` is filled in from `MAIL_FROM`; callers never pass it. `text` is required and `html` optional, so a caller cannot accidentally send an HTML-only email that renders as blank in a text client.

**It never throws.** A transport error is caught and logged via Nest's `Logger` (recipient, subject, error), and the promise resolves. Rationale: the caller is an HTTP request handler, and whether an email left the building is not something the HTTP response should depend on — a relay outage would otherwise turn every consumer into a 500. Consumers that genuinely need delivery confirmation are out of scope, and would need a queue anyway.

`nodemailer` and `@types/nodemailer` are the only new dependencies.

## Local development

`docker-compose.yml` gains a `mailpit` service (`axllent/mailpit`, SMTP on `1025`, web UI on `8025`) alongside the existing `postgres`. `backend/.env.example` points at it with empty credentials.

Local and production run identical code — real SMTP on both sides, only the environment differs. There is no fake, console, or JSON transport to keep in sync with the real one.

## Testing

One spec file, `backend/src/mail/mail.service.spec.ts`, with `nodemailer` mocked. It covers the three things that fail silently:

1. With `SMTP_USER` set, the transport is created **with** an `auth` object; with it empty, **without** one. (Getting this backwards breaks either dev or prod, and only at runtime.)
2. `send()` fills `from` from `MAIL_FROM` and passes `to` / `subject` / `text` / `html` through unchanged.
3. When the transport rejects, `send()` resolves rather than rejecting, and logs the failure.

No test performs a real SMTP send.

## Rollout

1. `docker compose up -d` picks up Mailpit; verify a send lands in the web UI at `localhost:8025`.
2. Pick an SMTP relay, add its SPF/DKIM records to `pantagruweb.club` in Cloudflare, verify the domain.
3. Set `SMTP_*` and `MAIL_FROM` in the backend's production environment.
4. Deploy. No schema change, no migration, and no user-visible behaviour change — nothing calls `send()` yet.
