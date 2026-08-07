# R2 storage migration — design

**Date:** 2026-08-08
**Status:** Approved, ready for implementation planning

## Context

The user wants to deploy Tambouille (Vue 3 + NestJS + PostgreSQL) on Cloudflare. This is a multi-part effort — file storage, database hosting, backend containerization, frontend hosting, and final wiring are each independent enough to plan separately. This spec covers the first and most code-impactful piece: **migrating uploaded files (mix audio, mix covers, user avatars, user profile banners) from local disk storage to Cloudflare R2**, a prerequisite for any Cloudflare hosting option since the backend's eventual runtime (Cloudflare Containers, chosen over a Workers rewrite) does not offer durable local disk storage across restarts/redeploys.

The remaining pieces (managed Postgres selection, containerizing the backend, Cloudflare Pages for the frontend, final DNS/env wiring) are separate follow-up specs, out of scope here.

## Scope

In scope:
- Replace Multer's local-disk storage engine with `multer-s3`, pointed at an R2 bucket via its S3-compatible API.
- One code path for both local development and production — no disk-storage fallback. Local dev uses a separate R2 bucket (`tambouille-dev`).
- Public R2 bucket; uploaded files are served directly from R2's public URL, not proxied through the backend.
- Remove the backend's `ServeStaticModule` (`/uploads`) — no longer needed once nothing is served from local disk.
- Update the frontend's `mediaUrl()` helper to resolve against R2's public URL instead of the backend origin.

Out of scope (deferred):
- Migrating existing local files in `backend/uploads/` into R2 — current data is test/dev-only; starting fresh in R2 is fine.
- Deleting R2 objects when a mix/avatar/banner is removed or replaced (matches today's behavior: the app does not currently delete replaced/removed local files either — no regression, just not solved here).
- Signed URLs / private bucket access — files are public content today (mixes, avatars) and stay public in R2.
- Database hosting, backend containerization, frontend hosting, DNS — separate specs.

## Architecture

**Storage engine:** `multer-s3` (backed by `@aws-sdk/client-s3` v3) replaces Multer's `diskStorage`. The S3 client is configured with R2's account-scoped S3-compatible endpoint (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) and R2 API credentials. Everywhere the app currently uses `FileInterceptor`/`FileFieldsInterceptor` with a `diskStorageFor(...)`/`diskStorageByField(...)` storage option, that option is swapped for an R2-backed equivalent with the same call shape — the interceptor usage, field names, and MIME validation in `mixes.controller.ts` and `users.controller.ts` do not otherwise change.

**Object keys:** Uploaded files are stored under the same subdirectory scheme used today, minus the `/uploads` prefix (which stops being meaningful once nothing is served from the backend): `audio/<uuid>.<ext>`, `covers/<uuid>.<ext>`, `avatars/<uuid>.<ext>`, `banners/<uuid>.<ext>`. This key — not a full URL — is what gets stored in the relevant database column (`Mix.audioUrl`, `Mix.coverUrl`, `User.avatarUrl`, `User.coverUrl` for the profile banner), mirroring exactly how a relative `/uploads/...` path is stored today. Column names and shapes are unchanged; only the string content changes (no more `/uploads` prefix).

**Access model:** The R2 bucket is public (R2.dev subdomain is sufficient to start — a custom domain can be added later without further code changes, since only the `R2_PUBLIC_URL` env var would change). Files load directly from R2; the backend is never in the request path for reads. This removes the need for `ServeStaticModule` in `app.module.ts` entirely.

**Environment variables** (new, in both `backend/.env` and `backend/.env.example`):
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` — the bucket's public base URL (e.g. `https://pub-xxxxx.r2.dev`), with no trailing slash

**Frontend:** a new `VITE_R2_PUBLIC_URL` env var (in `frontend/.env` / `.env.example`). `frontend/src/utils/media.ts`'s `mediaUrl()` helper is updated to prefix stored keys with this URL instead of deriving a base URL from `VITE_API_BASE_URL`.

**Local development:** always uses R2 (via a dedicated `tambouille-dev` bucket) — the same code path as production, just pointed at a different bucket/credentials through `.env`. No disk-storage branch to maintain, no "works locally, breaks in prod" class of bugs from divergent code paths.

## Manual prerequisites (user, outside any agent's reach)

Before implementation can be verified end-to-end, the user must, in their own Cloudflare dashboard:
1. Create an R2 bucket named `tambouille-dev` (and, later, a separate `tambouille-prod` bucket when the production deploy spec is built).
2. Enable public access on the bucket (the R2.dev subdomain option is enough to start).
3. Create an R2 API token scoped to that bucket, yielding an Access Key ID and Secret Access Key.
4. Note the Cloudflare Account ID (visible in the dashboard) needed to build the S3-compatible endpoint URL.

These values populate the new `R2_*` env vars above. No agent can create Cloudflare account resources — this step blocks Task 5-equivalent (integration verification) in the implementation plan until done.

## Testing / verification plan

Consistent with how every other feature in this project has been verified:
1. `npm run build` on the backend to confirm the new storage engine code compiles.
2. `npm run type-check` on the frontend after the `mediaUrl()` change.
3. A `curl`-based upload pass once R2 credentials are in `.env`: upload a mix (audio + cover) and an avatar, confirm the API response's URLs resolve to `R2_PUBLIC_URL/<key>`, and confirm those URLs actually serve the uploaded bytes (`curl -I` on the returned URL, expect `200`).
4. Browser pass: upload a mix with a cover through the UI, confirm the cover renders and the audio plays (streamed straight from R2); update a profile avatar and banner the same way.
