# TODOS

## Infrastructure

### Validate environment variables at startup

**What:** Wire a validation schema (`zod` or `joi`) into `ConfigModule.forRoot` in `backend/src/app.module.ts`, covering every environment variable the backend reads.

**Why:** Nothing checks the environment today. The one that matters is `JWT_SECRET`: `backend/.env.example` ships the placeholder `"change-me-in-production"`, and a deployment that goes out with that value signs every auth token with a publicly known secret. No code notices. The README flags it in a comment, which is the protection level of a sticky note. Missing `DATABASE_URL`, `PORT`, or the new `SMTP_*` variables fail later and in unrelated-looking ways.

**Context:** Surfaced during `/plan-eng-review` of the transactional-emails spec (2026-08-08), as option D4-B. That review's D4-A fix covers `MAIL_FROM` only — a throw in the `MailService` constructor. It was deliberately not generalized: a global env schema touches the whole application's configuration, and that branch had just been narrowed to mail sending alone. Starting point: `ConfigModule.forRoot({ isGlobal: true })` at `backend/src/app.module.ts:14`. Refuse to boot on a missing required variable, and reject the literal `change-me-in-production` value for `JWT_SECRET`.

**Effort:** M
**Priority:** P1
**Depends on:** None

## Testing

### Delete or rewrite the scaffolded e2e test

**What:** `backend/test/app.e2e-spec.ts` is the file `nest new` generates. Remove it, or replace it with a real health check.

**Why:** It asserts `GET /` returns `"Hello World!"`. There is no `AppController` in the project, and `backend/src/main.ts:20` sets a global `/api` prefix, so the request cannot match. The test fails every run. It is the only file in the e2e suite, which means `npm run test:e2e` is permanently red and the suite carries no signal.

**Context:** Surfaced during `/plan-eng-review` of the transactional-emails spec (2026-08-08). That spec's task T8 adds an e2e regression test (the app must boot with an unreachable SMTP host). It will land in a suite that is already failing, where a genuine regression would be indistinguishable from the existing noise. Fixing this is a one-line `git rm`; replacing it with a real check against `/api` is about ten minutes.

**Effort:** S
**Priority:** P2
**Depends on:** None
