# TODOS

## Infrastructure

### Validate environment variables at startup

**What:** Wire a validation schema (`zod` or `joi`) into `ConfigModule.forRoot` in `backend/src/app.module.ts`, covering every environment variable the backend reads.

**Why:** Nothing checks the environment today. The one that matters is `JWT_SECRET`: `backend/.env.example` ships the placeholder `"change-me-in-production"`, and a deployment that goes out with that value signs every auth token with a publicly known secret. No code notices. The README flags it in a comment, which is the protection level of a sticky note. Missing `DATABASE_URL`, `PORT`, or the new `SMTP_*` variables fail later and in unrelated-looking ways.

**Context:** Surfaced during `/plan-eng-review` of the transactional-emails spec (2026-08-08), as option D4-B. That review's D4-A fix covers `MAIL_FROM` only — a throw in the `MailService` constructor. It was deliberately not generalized: a global env schema touches the whole application's configuration, and that branch had just been narrowed to mail sending alone. Starting point: `ConfigModule.forRoot({ isGlobal: true })` at `backend/src/app.module.ts:14`. Refuse to boot on a missing required variable, and reject the literal `change-me-in-production` value for `JWT_SECRET`.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Require TLS on the SMTP transport in production

**What:** Decide how `MailService` should enforce transport encryption, and implement it. Today `backend/src/mail/mail.service.ts` sets neither `requireTLS` nor `ignoreTLS`.

**Why:** With `secure: false` and no `requireTLS`, nodemailer performs *opportunistic* STARTTLS — `node_modules/nodemailer/lib/smtp-connection/index.js:1506` only upgrades the connection `if (!this.secure && !this.options.ignoreTLS && /STARTTLS/.test(...))`. A relay that does not advertise STARTTLS, or an active attacker who strips the advertisement from the EHLO response, gets `SMTP_PASS` in cleartext, and nothing logs a warning. This service is intended to carry password-reset links, so the traffic is worth protecting.

**Context:** Surfaced by the code quality review of Task 2 (commit `d6b6889`) during the transactional-emails work, 2026-08-08. The obvious one-line fix, `requireTLS: !secure`, cannot be applied as-is: Mailpit does not offer STARTTLS, so it would break every local send and the `mail:test` CLI. Options to weigh: a seventh environment variable (`SMTP_REQUIRE_TLS`, default `true`, set to `false` in `.env.example` for Mailpit); or deriving it from whether the host is loopback, which is implicit and probably worse. Whichever is chosen, `getTransporter()` in `backend/src/mail/mail.service.ts` is the place it goes, and `mail.service.spec.ts` should get a test pinning the resulting option.

**Downgraded to P3 on 2026-08-08:** production now sends through Gmail on port 465, which is implicit TLS — the connection is encrypted before any SMTP conversation happens, so there is no STARTTLS advertisement to strip and no cleartext window for the credentials. The gap only reopens if the relay ever moves to port 587, or to any host reached with `SMTP_SECURE=false`. Worth doing as defence in depth against exactly that change, not as a live exposure.

**Effort:** S
**Priority:** P3
**Depends on:** None (the mail service exists as of this branch)

## Testing

### Delete or rewrite the scaffolded e2e test

**What:** `backend/test/app.e2e-spec.ts` is the file `nest new` generates. Remove it, or replace it with a real health check.

**Why:** It asserts `GET /` returns `"Hello World!"`. There is no `AppController` in the project, and `backend/src/main.ts:20` sets a global `/api` prefix, so the request cannot match. The test fails every run. It is the only file in the e2e suite, which means `npm run test:e2e` is permanently red and the suite carries no signal.

**Context:** Surfaced during `/plan-eng-review` of the transactional-emails spec (2026-08-08). That spec's task T8 adds an e2e regression test (the app must boot with an unreachable SMTP host). It will land in a suite that is already failing, where a genuine regression would be indistinguishable from the existing noise. Fixing this is a one-line `git rm`; replacing it with a real check against `/api` is about ten minutes.

**Effort:** S
**Priority:** P2
**Depends on:** None
