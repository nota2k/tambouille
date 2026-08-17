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

**What:** A GitHub Actions pipeline that builds both packages and pushes the artefacts to o2switch over SSH, replacing the manual procedure. Trigger: push on `main`, plus a manual `workflow_dispatch`. One environment only — production. Tests are blocking.

**Why:** Today the two halves of a deployment are built in different places by different actors. The frontend is built on a developer's machine and its `dist/` is committed to git; `frontend/.gitignore` carries the scar in a comment — "un build oublié partait donc en silence". The backend is compiled *on the shared host*, where CPU is throttled and memory is capped by CloudLinux LVE: `npm ci` plus `nest build` is the most fragile step of the whole operation, and it runs at the worst possible moment. Nothing guarantees that the frontend and backend in production come from the same commit, and nothing is written down — `backend/README.md` is still the untouched NestJS boilerplate. Building both from one CI checkout makes the same-commit property structural instead of hoped for.

**Context:** Explored 2026-08-17 (`/opsx:explore`), deliberately parked until `add-keycloak-oidc-login` lands — both chantiers touch `package.json` and `.gitignore`.

Server layout as it stands: `~/tambouille` is a git clone on branch `o2switch-db`; `api/.htaccess` is the docroot of `api.tambouille.pantagruweb.club` and points Passenger at `~/tambouille/backend`, startup file `dist/src/main.js`, node 22 from `nodevenv`; `frontend/dist/` is the docroot of the main domain; `backend/.env` holds every secret and is not in git.

Decisions taken, not to be relitigated:

- Build everything in CI, ship artefacts by rsync over SSH. The server only receives and restarts.
- `rsync --delete` **per subdirectory, never on `backend/` itself** — `dist/`, `generated/`, `prisma/` each with `--delete`, `package.json` and `package-lock.json` without. `.env`, `.htaccess`, `node_modules/` and `tmp/` live at the root of `backend/` and are therefore out of reach by construction, rather than by an `--exclude` list somebody forgets to extend. A `--delete` on the parent would erase the production secrets.
- `~/tambouille` stops being a git clone (drop its `.git`), and `api/.htaccess` and `backend/.htaccess` become server-owned files that the deployment never overwrites. They stay in git as documentation.
- `frontend/dist/` leaves version control once CI builds it; the explanatory comment in `frontend/.gitignore` gets rewritten, since it argues for the opposite.
- `npm ci --omit=dev` on the server only when `package-lock.json` actually changed.
- Restart is `touch backend/tmp/restart.txt`.
- No release directories, no symlink swap, no post-deploy healthcheck: rollback is a `git revert` and one pipeline run. Accepted for a site this size; revisit when a broken production costs more than three minutes.

Three blockers, all true today and all independent of this work:

1. `backend/package.json` declares `"postinstall": "prisma generate"` while `prisma` is a devDependency, so `npm ci --omit=dev` invokes a CLI it did not install and fails. `--ignore-scripts` is not a way out: `bcrypt` is a native module that needs its install script. The fix is to drop `prisma generate` from `postinstall` — CI generates the client and rsyncs `generated/` — at the cost of a local `npm install` no longer regenerating it.
2. Every `lint` script in the repo auto-corrects instead of failing (`eslint --fix`, `oxlint --fix`, `prettier --write`). Wired into CI as-is they go green on anything fixable and the fix is thrown away with the runner. Either add non-fixing variants, or decide lint is not blocking and keep only the tests. **Undecided.**
3. The scaffolded e2e test must go first — see "Delete or rewrite the scaffolded e2e test" below. While it is there, "blocking tests" means nothing ever deploys.

**Where the migrations run — settled, see the analysis below.** Migrations go through SSH: `ssh 'cd ~/tambouille/backend && npx --yes prisma@7 migrate deploy'`, and the Postgres port closes. Running `prisma migrate deploy` straight from the CI job is one line shorter and 20-40 s faster per deployment, but it requires the production database to stay reachable from the whole internet — GitHub runners have no fixed IP, so there is no allowlist to write. Either way, migrate *before* the code lands and keep migrations additive; with a single environment that discipline has no safety net.

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

The test that decides it: would this rule have been voted through, had it been presented as a rule? *"The database holding your e-mail address and your password hash stays reachable from any machine on earth, to save thirty seconds per deployment."* Nobody votes yes. The convenience accrues to whoever runs the deployment; the risk accrues to people who were never asked. That asymmetry is the whole finding, and it is why the lean became a decision.

Note that this analysis lands against the convenience of the person who performed it, not in favour of it. When the four-column table lands somewhere comfortable for whoever already holds the power, it should be distrusted; here it does not, which is the only reason to trust it.

Still open:

- **The lint question** (blocker 2 above) — still undecided, and it is a genuine choice rather than an oversight.
- **The `o2switch-db` branch.** Once production deploys from `main` it has no reason to exist. Merge it or delete it, but first check it holds nothing `main` does not.

Prisma 7 helps here and it is worth knowing why: `prisma/schema.prisma` uses `provider = "prisma-client"` with the `@prisma/adapter-pg` driver adapter, so there is no native Rust query engine — the generated client is portable JavaScript and can be built on an Ubuntu runner and rsynced to CloudLinux without a thought for `binaryTargets`. `bcrypt` is the opposite case, which is why `node_modules` must keep being installed on the server and never travel.

GitHub secrets needed: an SSH key dedicated to deployment (added under cPanel › Accès SSH), the host, the user, and the server's host fingerprint so `StrictHostKeyChecking` can stay on. Nothing for the frontend — `frontend/.env.production` holds only public identifiers.

**Effort:** L
**Priority:** P2
**Depends on:** `add-keycloak-oidc-login` merged; blocker 3 (the scaffolded e2e test) removed

## Testing

### Delete or rewrite the scaffolded e2e test

**What:** `backend/test/app.e2e-spec.ts` is the file `nest new` generates. Remove it, or replace it with a real health check.

**Why:** It asserts `GET /` returns `"Hello World!"`. There is no `AppController` in the project, and `backend/src/main.ts:20` sets a global `/api` prefix, so the request cannot match. The test fails every run. It is the only file in the e2e suite, which means `npm run test:e2e` is permanently red and the suite carries no signal.

**Context:** Surfaced during `/plan-eng-review` of the transactional-emails spec (2026-08-08). That spec's task T8 adds an e2e regression test (the app must boot with an unreachable SMTP host). It will land in a suite that is already failing, where a genuine regression would be indistinguishable from the existing noise. Fixing this is a one-line `git rm`; replacing it with a real check against `/api` is about ten minutes.

**Effort:** S
**Priority:** P2
**Depends on:** None
