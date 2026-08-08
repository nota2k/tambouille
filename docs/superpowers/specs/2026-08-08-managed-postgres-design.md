# Managed Postgres — design

**Date:** 2026-08-08
**Status:** Approved, ready for implementation planning

## Context

Second sub-project of the Cloudflare deployment effort, following the [R2 storage migration](2026-08-08-r2-storage-migration-design.md). The backend currently connects to Postgres running via local `docker-compose` (`localhost:5432`), which is unreachable from anywhere outside the developer's machine. Before the backend can run in Cloudflare Containers, it needs a Postgres instance reachable over the network.

The remaining pieces (containerizing the backend, Cloudflare Pages for the frontend, final DNS/env wiring) are separate follow-up specs, out of scope here.

## Scope

In scope:
- Provision a managed Postgres database on Neon (free tier) for the deployed/Cloudflare environment.
- Push the current Prisma schema to it fresh via `prisma migrate deploy` — no data migration from local Postgres.
- Verify the backend can actually run against it (not just that the schema applies cleanly) via a real connectivity + CRUD pass.
- Document the new `DATABASE_URL` value's origin and how to rotate it.

Out of scope (deferred):
- Migrating existing local Postgres data — current data is dev/test-only; starting fresh on Neon is fine (consistent with the R2 decision).
- Connection pooling / PgBouncer tuning beyond using Neon's direct (unpooled) connection string.
- Automating the migration step in a CI/CD pipeline — that lands with the containerization spec, which will decide how deploys actually run.
- Database branching / preview databases.
- Backup/restore strategy beyond what Neon provides by default on the free tier.
- Local development database — `docker-compose`'s local Postgres stays the default for day-to-day work; nothing about local dev changes.

## Architecture

**Provider:** [Neon](https://neon.tech), free tier. Chosen over Supabase because the app doesn't need Supabase's bundled auth/storage/realtime features (auth is already custom JWT; storage is already R2) — Neon is plain serverless Postgres with nothing unused to configure around.

**Connection:** Prisma already abstracts the database connection entirely through `DATABASE_URL` (via `@prisma/adapter-pg`) — no application code changes are needed for this sub-project. Swapping databases is purely an env var change plus a one-time schema push.

Use Neon's **direct (unpooled) connection string**, not the PgBouncer-fronted pooled one. `@prisma/adapter-pg` maintains its own persistent connection pool, which doesn't cooperate well with PgBouncer's transaction-mode pooling (prepared statement errors). A single Cloudflare Container instance with a small Prisma pool doesn't need Neon's pooler yet; this can be revisited later if connection limits become a real constraint.

**Environment variables:** No new variable names — `DATABASE_URL` is reused, just pointed at Neon's connection string instead of `localhost:5432` for the deployed environment. Local `backend/.env` keeps pointing at the local `docker-compose` Postgres, unchanged. The Neon connection string is a real credential and is never committed — it lives only in the environment where the deployed backend actually runs (documented as a manual step for now, since automated deploy-time secret injection is part of the containerization spec, not this one).

## Testing / verification plan

Consistent with how every other feature in this project has been verified:
1. `npx prisma migrate deploy` against the Neon connection string — confirm it applies cleanly to a fresh database.
2. A temporary local verification pass: point the local backend's `DATABASE_URL` at Neon, restart it, and run a real `curl`-based smoke test (register a user, log in, list mixes) to confirm the app actually works against the remote database, not just that the schema matches.
3. Restore the local `.env` to the local `docker-compose` Postgres afterward — local day-to-day development is unaffected by this sub-project.
