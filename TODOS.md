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

**Context:** Surfaced by the code quality review of Task 2 (commit `d6b6889`) during the transactional-emails work, 2026-08-08. The obvious one-line fix, `requireTLS: !secure`, cannot be applied as-is: Mailpit does not offer STARTTLS, so it would break every local send and the `mail:test` CLI. Options to weigh: a seventh environment variable (`SMTP_REQUIRE_TLS`, default `true`, set to `false` in `.env.example` for Mailpit); or deriving it from whether the host is loopback, which is implicit and probably worse. Whichever is chosen, the Task 2 constructor validation is the place it goes, and `mail.service.spec.ts` should get a test pinning the resulting option.

**Effort:** S
**Priority:** P1
**Depends on:** None (the mail service exists as of this branch)

### Automate the build and deployment to o2switch

**What:** Superseded. This work is now the OpenSpec change `add-o2switch-deploy`, which carries a proposal, a `deployment` spec, a design and 26 tasks. Read those; do not plan from this entry.

**Why it is kept:** it holds two things the change does not. A record of what a reconnaissance refuted, and a piece of reasoning that turned out to rest on a false premise — kept visible rather than quietly deleted, because an error that leaves no trace gets made again.

**What the reconnaissance of 2026-08-17 refuted**, claim by claim:

| Claim this entry made | What the server actually says |
|---|---|
| `~/tambouille` is a clone on branch `o2switch-db` | It is on `main`, and had never tracked `o2switch-db` |
| Production is 52 commits behind | Five. The 52 counted a divergence against `o2switch-db` measured before the squash merges compacted it |
| `npm ci --omit=dev` on the server when the lock changes | `npm ci` deletes `node_modules`, which CloudLinux requires to be a symlink into the app's virtualenv. Running it broke production on 17 August and the link had to be restored by hand. The correct form is `npm install --omit=dev` |
| The database is reachable from the internet | It listens on `localhost:5432` |
| `frontend/dist` leaves git once CI builds it | True eventually, but not unconditionally: on 17 August the server-side frontend build failed and the committed `dist` was the only thing serving the site. It may only leave once the pipeline is observed delivering the bundle |

Three blockers this entry listed: the scaffolded e2e test is gone (`add-ci-checks`, task 1.1); the lint question is settled (format blocking, eslint reporting — see "Clear the static-analysis backlog" below); `postinstall: prisma generate` **is still live**, and matters more than before, since the server now runs `npm install --omit=dev` without the prisma CLI installed.

Still worth knowing, and carried into the change's design: Prisma 7 with the `@prisma/adapter-pg` driver adapter generates a portable JavaScript client with no native query engine, so it can be built on an Ubuntu runner and shipped as-is. `bcrypt` is the opposite case, which is why runtime dependencies must keep being installed on the server and can never travel.

---

**The analysis below is void, and that is the point of keeping it.**

It answers "who may attempt to reach the production database" on the assumption that the port faces the internet. It does not: the datasource is `localhost:5432`, measured on the server. No third party was ever exposed, so there was no rule to weigh and no recourse to be denied.

The conclusion it reached — migrations travel over SSH — happens to be correct, for a reason the analysis never considered: there is no other route. A sophisticated argument that lands on the right answer from a premise nobody checked is not a good argument, and reading it back is a useful reminder of how convincing one can look.

// incongru-voix: lessig — l'accès à la base de production régulé par l'architecture (port fermé) plutôt que par le seul mot de passe — recours des personnes concernées : aucun

```
CONSTRAINT : who may attempt to reach the production database.
             With the port open: nobody is constrained, every host on the
             internet may try. The people who carry the consequence are the
             site's registered users — e-mails, password hashes, Google and
             Keycloak subjects — none of whom signed anything.

  law           Art. 323-1 code pénal (fraudulent access to an automated
                system); GDPR art. 32 (security of processing). Both act
                AFTER. They punish the intruder and can fine the controller.
                They prevent nothing and warn nobody in advance.

  norm          Nothing. No professional norm reaches a Postgres port on
                shared hosting. No peer ever sees it.

  price         Attempting costs nothing: the IPv4 space is scanned
                continuously and for free. Closing costs 20-40 s per
                deployment. Note who pays what — the attempt is free to the
                attacker, the closing is billed to the deployer, the breach
                is billed to the users.

  architecture  Port open: zero. The password is the only wall, and a wall
                that answers every knock is a wall under permanent test.
                Port closed, migrations over SSH: total. No route exists.

  RECOURSE      None. Users are not notified that the port is open, cannot
                inspect it, cannot object, and would learn of the decision
                only through its failure. GDPR art. 33/34 gives them a
                notification 72 h after the breach — that is a remedy, not
                a recourse.
```

**Effort:** — (superseded by `add-o2switch-deploy`)
**Priority:** —
**Depends on:** —

### Require the CI checks on `main`

**What:** In GitHub's *Settings › Branches*, add a ruleset on `main` with "Require status checks to pass", listing `backend`, `frontend` and `e2e`.

**Why:** The workflow added by `add-ci-checks` runs on every pull request and reports its verdict, but nothing consumes that verdict. A red pull request is still mergeable — which is precisely how PR #4 went in with an empty `statusCheckRollup`. Until this setting exists, the pipeline is an opinion, and the whole point of the change was to have something a reviewer can rely on rather than an opinion.

**Context:** Task 3.4 of `add-ci-checks`, the one task that could not be done from the repository. It is a GitHub UI setting and needs admin rights on `nota2k/tambouille`; deferred on 2026-08-17 because those were not available at the time. Everything it depends on is finished: the three checks were observed green, and each was observed red on a deliberate breakage (a falsified assertion, a type error, a misformatted file), so the names above are known to exist and known to fail when they should.

Delete this entry once the ruleset is in place.

**Effort:** S
**Priority:** P1
**Depends on:** PR #5 merged; admin rights on the repository

### Clear the static-analysis backlog, then make eslint blocking

**What:** Fix what `eslint` reports on both packages, then move `lint:check` out of `continue-on-error` in `.github/workflows/ci.yml`.

**Why:** CI runs `eslint` today but ignores its verdict. A report nothing is obliged to read is read by nobody, and the decision not to block quietly becomes a decision to abandon. The counts are the reason it was not blocking from the start: **659 problems on the backend** (637 errors across 47 files, of which only 365 are auto-fixable — so ~294 need judgement), and **22 on the frontend**. Requiring all of that before any merge would have meant a refactor of that size landing inside a change whose object was to add one workflow file.

Not all of it is cosmetic. The frontend's 22 break down as 16 `@typescript-eslint/no-explicit-any` and **6 `vue/no-mutating-props`** — a component writing into its own props is a defect, not a style preference: the parent owns that value, the mutation is invisible from where the value is declared, and Vue's reactivity makes the resulting bug non-local. Those six are worth fixing before the other 675.

**Context:** Deliberate carve-out from `add-ci-checks` (2026-08-17), taken after measuring. The user was first offered "lint blocking" on my description of it as "probably some formatting drift"; the measurement showed otherwise and the scope was re-decided with the real numbers. Formatting *was* mechanical and is already done — `prettier --check` blocks on both packages as of that change.

Suggested order: the 6 prop mutations first (real defects, smallest set), then `--fix` the 365 auto-fixable backend errors in an isolated commit, then the remaining ~294 by hand, then flip the two `continue-on-error: true` flags and delete this entry.

**Effort:** L
**Priority:** P2
**Depends on:** `add-ci-checks` merged

## Testing

### Identify the flaky unit tests

**What:** Capture the full output the next time `backend` unit tests fail without a code change, and fix whatever it names.

**Why:** During `add-ci-checks` the suite failed once in eight observed runs — 3 tests across 2 suites, in 25 s against a normal 5 to 15 s. It was never reproduced afterwards, including under a CPU load saturating all eight cores, and the output was not captured, so the failing tests are unknown. GitHub runners are slower and noisier than the machine that measurement was made on, so a timing-sensitive failure will surface there more often than it did locally.

This matters more than one flake usually would, because the whole change rests on the premise that a red CI means something. A suite that fails at random teaches people to re-run rather than to read, and once that habit exists a genuine regression is indistinguishable from noise — which is exactly the state `app.e2e-spec.ts` had already put the e2e suite in.

**Context:** Observed 2026-08-17 while sizing `add-ci-checks`. The workflow deliberately carries **no automatic retry**: a retry converts a real intermittent defect into invisible noise, which is the opposite of what the pipeline is for. That decision is recorded in the change's `design.md` and should not be revisited without diagnosing this first. The slow runs point at the two heaviest suites — `auth.service.spec.ts` (~9 s) and `mixes.controller.spec.ts` (~7 s) — as the place to look, but that is a hint from timings, not a finding.

**Effort:** M
**Priority:** P2
**Depends on:** Nothing, but it needs a recurrence to act on

<!-- "Delete or rewrite the scaffolded e2e test" was done as task 1.1 of
     add-ci-checks and removed from this file. Two things it got wrong, worth
     keeping because both were believed for months: the file did not fail on
     the `Hello World` assertion — it never reached it, dying at import on a
     missing `R2_ACCOUNT_ID` — and it was not the only file in the e2e suite.
     `test/mail-boot.e2e-spec.ts` sat beside it, green, pinning the guarantee
     that no SMTP fault stops the API from booting. -->
