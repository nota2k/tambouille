# R2 Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local-disk file storage (Multer's `diskStorage`) with Cloudflare R2 (via `multer-s3`) for all uploaded content — mix audio, mix covers, user avatars, user profile banners — as the first prerequisite of deploying Tambouille on Cloudflare.

**Architecture:** `backend/src/common/upload.utils.ts` is the single point where Multer's storage engine is configured; every upload endpoint already routes through it. Swapping its `diskStorage`-based helpers for `multer-s3`-based equivalents with the same call shape means the four upload endpoints (`POST /mixes`, `PATCH /mixes/:id`, `POST /users/me/avatar`, `POST /users/me/cover`) change minimally — just the storage engine reference and how the resulting object key is read off the uploaded file. The frontend's `mediaUrl()` helper is the single point where stored paths become loadable URLs; only its base URL changes, from the backend origin to R2's public URL. No other frontend file changes.

**Tech Stack:** NestJS 11, Multer 2 (via `@nestjs/platform-express`), `multer-s3` + `@aws-sdk/client-s3` (new), Vue 3, Vite.

## Global Constraints

- No automated test suite exists in this project (no Jest specs are run for features, despite `jest` being present in `devDependencies` from the Nest starter). Verification is via `nest build` / `vue-tsc --build` for compile correctness, `curl`-based integration checks, and manual browser checks — the established pattern for every feature built so far.
- Existing local files in `backend/uploads/` are **not** migrated — this is test/dev data. Task 4 deletes the local `uploads/` directory outright.
- Deleting R2 objects when a mix/avatar/banner is removed or replaced is explicitly out of scope (matches today's behavior — the app doesn't delete replaced/removed local files either).
- R2 bucket access is public (no signed URLs, no ACLs set per-object — R2 public access is a bucket-level setting, configured outside this codebase).
- One code path for local dev and production: both always use R2 (a `tambouille-dev` bucket locally, a separate bucket in production — production bucket setup is a later spec, not this one).
- **Manual prerequisite, blocking Task 6 only:** the user must create an R2 bucket named `tambouille-dev` in their Cloudflare dashboard, enable public access on it (the `r2.dev` subdomain option is enough), and create an R2 API token scoped to that bucket (yields an Access Key ID + Secret Access Key), plus note their Cloudflare Account ID. Tasks 1–5 and their own verification steps do not require this — only Task 6 (which performs a real upload against R2) and Task 7 (browser pass) do.

---

### Task 1: Guarantee `.env` loads before any decorator evaluates

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `process.env.*` is populated (via `dotenv`) before any other module in the app is imported/evaluated. Task 2's R2 client construction — which reads `process.env.R2_ACCOUNT_ID` etc. **at controller-decorator-evaluation time**, not inside a constructor — depends on this.

**Context for the implementer:** Nest currently loads environment variables via `ConfigModule.forRoot({ isGlobal: true })` in `app.module.ts`. That call only executes once `AppModule`'s own `@Module(...)` decorator is evaluated — which, because of how CommonJS `require()` resolves imports (each imported module fully executes before the importer's own remaining top-level code runs), happens **after** every module `app.module.ts` imports (including `UsersModule` → `UsersController`, `MixesModule` → `MixesController`) has already been fully loaded. Any code that reads `process.env` while a controller class's decorators are being evaluated — which is exactly when `FileInterceptor`/`FileFieldsInterceptor`'s `storage` option is constructed, since that's an argument expression evaluated at class-definition time — runs **before** `ConfigModule.forRoot()` has had a chance to populate `process.env` from `.env`. Today nothing at decorator-evaluation time reads `process.env`, so this has never surfaced as a bug. Task 2 changes that. The fix: load `.env` via a plain `dotenv` import as the very first line of the entry file, so it runs before anything else — including `app.module.ts` — is even imported.

- [ ] **Step 1: Add the dotenv side-effect import as the first line of `main.ts`**

Replace the top of `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
```

with:

```typescript
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
```

(Leave the rest of the file — the `bootstrap()` function body — unchanged.)

- [ ] **Step 2: Move `dotenv` from devDependencies to dependencies**

`dotenv` is currently a devDependency (added earlier for `prisma.config.ts`, a CLI-only file). It's now a runtime dependency of `main.ts` too, so it must be installed in production. Run:

```bash
cd backend && npm uninstall dotenv && npm install dotenv
```

(`npm install <pkg>` without `-D` adds it to `dependencies`.)

- [ ] **Step 3: Verify the app still builds and starts identically**

```bash
cd backend && npm run build
```

Expected: no errors.

Then, with the dev server running (`npm run start:dev` if not already up), confirm it started cleanly:

```bash
tail -20 /tmp/backend.log
```

Expected: the usual `Mapped {...}` route lines ending in `Nest application successfully started`, no new errors. This step is a regression check only — Task 1's actual purpose (R2 credentials being readable at decorator-evaluation time) is verified in Task 6, once real R2 env vars exist.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main.ts backend/package.json backend/package-lock.json
git commit -m "$(cat <<'EOF'
Load .env before any module import, not just via ConfigModule

ConfigModule.forRoot() populates process.env too late for code that
reads it at controller-decorator-evaluation time (as the upcoming R2
storage engine will) — CommonJS import order means every controller a
module imports is fully evaluated before that module's own @Module()
decorator runs. A plain dotenv import as main.ts's first line fixes
the ordering for good.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: R2-backed storage engine in `upload.utils.ts`

**Files:**
- Modify: `backend/src/common/upload.utils.ts`
- Modify: `backend/package.json`
- Modify: `backend/.env`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `process.env.R2_ACCOUNT_ID`, `process.env.R2_ACCESS_KEY_ID`, `process.env.R2_SECRET_ACCESS_KEY`, `process.env.R2_BUCKET_NAME` (all populated by Task 1's fix before this file's module-level `S3Client` is constructed).
- Produces: `r2StorageFor(subdir: string)`, `r2StorageByField(fieldToSubdir: Record<string, string>)` — same call shape as the `diskStorageFor`/`diskStorageByField` they replace, returning a Multer `StorageEngine`. `UploadedFile` interface (extends `Express.Multer.File` with a `key: string` field — the R2 object key multer-s3 assigns). `AUDIO_MIME_TYPES`, `IMAGE_MIME_TYPES`, `fileFilterFor`, `fileFilterByField` are unchanged and still exported. Consumed by Task 3.

- [ ] **Step 1: Install the new dependencies**

```bash
cd backend && npm install @aws-sdk/client-s3 multer-s3
```

- [ ] **Step 2: Add the R2 env vars**

Append to `backend/.env` (replace the placeholder values with real ones once the manual Cloudflare prerequisite is done — see this plan's Global Constraints; a placeholder is fine for now, Tasks 2–5 only need the file to compile and run, not to actually reach R2):

```
R2_ACCOUNT_ID="changeme"
R2_ACCESS_KEY_ID="changeme"
R2_SECRET_ACCESS_KEY="changeme"
R2_BUCKET_NAME="tambouille-dev"
```

Also remove these two now-unused lines from `backend/.env` (grep confirms nothing in `src/` reads them — they were never wired up):

```
UPLOADS_DIR="uploads"
MAX_UPLOAD_SIZE_MB=200
```

Apply the identical additions and removal to `backend/.env.example` (using the same `"changeme"` placeholders — `.env.example` never holds real secrets).

- [ ] **Step 3: Rewrite `upload.utils.ts`**

Replace the full contents of `backend/src/common/upload.utils.ts`:

```typescript
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import type { Request } from 'express';

export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A file uploaded through r2StorageFor/r2StorageByField carries its R2 object key instead of a local filename. */
export interface UploadedFile extends Express.Multer.File {
  key: string;
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

function objectKey(subdir: string, originalname: string): string {
  return `${subdir}/${randomUUID()}${extname(originalname).toLowerCase()}`;
}

export function r2StorageFor(subdir: string) {
  return multerS3({
    s3: r2Client,
    bucket: process.env.R2_BUCKET_NAME ?? '',
    key: (_req, file, callback) => {
      callback(null, objectKey(subdir, file.originalname));
    },
  });
}

/** Routes each uploaded file into a subdirectory based on its form field name. */
export function r2StorageByField(fieldToSubdir: Record<string, string>) {
  return multerS3({
    s3: r2Client,
    bucket: process.env.R2_BUCKET_NAME ?? '',
    key: (_req, file, callback) => {
      const subdir = fieldToSubdir[file.fieldname] ?? 'misc';
      callback(null, objectKey(subdir, file.originalname));
    },
  });
}

export function fileFilterFor(allowedMimeTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      return;
    }
    callback(null, true);
  };
}

/** Validates each uploaded file's mime type against the allowed list for its form field name. */
export function fileFilterByField(fieldToAllowedMimeTypes: Record<string, string[]>) {
  return (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = fieldToAllowedMimeTypes[file.fieldname] ?? [];
    if (!allowed.includes(file.mimetype)) {
      callback(new BadRequestException(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`), false);
      return;
    }
    callback(null, true);
  };
}
```

Note what's unchanged: `AUDIO_MIME_TYPES`, `IMAGE_MIME_TYPES`, `fileFilterFor`, `fileFilterByField` are copied verbatim — they never depended on the storage engine. Only the storage-engine functions and their names change (`diskStorageFor` → `r2StorageFor`, `diskStorageByField` → `r2StorageByField`), plus the new `UploadedFile` type.

- [ ] **Step 4: Verify it compiles**

```bash
cd backend && npm run build
```

Expected: errors referencing `mixes.controller.ts` and `users.controller.ts` (they still import `diskStorageFor`/`diskStorageByField`, which no longer exist) — that's expected and resolved in Task 3. There should be **no** errors originating from `upload.utils.ts` itself. If there are, fix them before moving on (common culprit: a missing type export from `multer-s3` — check its bundled `.d.ts` under `node_modules/multer-s3/dist` if the build complains about implicit `any` on the `key` callback's `file` parameter).

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/upload.utils.ts backend/package.json backend/package-lock.json backend/.env backend/.env.example
git commit -m "$(cat <<'EOF'
Replace disk storage with R2 (multer-s3) in upload.utils.ts

r2StorageFor/r2StorageByField mirror diskStorageFor/diskStorageByField's
call shape so controller call sites barely change. Uploaded files now
carry an R2 object key (file.key) instead of a local filename. Mime-type
validation is untouched. Controllers are updated in the next task — this
one won't build clean on its own until then.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update `mixes.controller.ts` and `users.controller.ts` to use R2 storage

**Files:**
- Modify: `backend/src/mixes/mixes.controller.ts`
- Modify: `backend/src/users/users.controller.ts`

**Interfaces:**
- Consumes: `r2StorageFor`, `r2StorageByField`, `UploadedFile` from Task 2.
- Produces: `Mix.audioUrl`/`Mix.coverUrl`/`User.avatarUrl`/`User.coverUrl` are now populated with a bare R2 object key (e.g. `audio/3f2e...-1a2b.mp3`), not a `/uploads/...` path. Consumed by Task 5 (frontend `mediaUrl()`).

- [ ] **Step 1: Update `mixes.controller.ts`**

Change the import block:

```typescript
import {
  AUDIO_MIME_TYPES,
  diskStorageByField,
  diskStorageFor,
  fileFilterByField,
  fileFilterFor,
  IMAGE_MIME_TYPES,
} from '../common/upload.utils';
```

to:

```typescript
import {
  AUDIO_MIME_TYPES,
  r2StorageByField,
  r2StorageFor,
  fileFilterByField,
  fileFilterFor,
  IMAGE_MIME_TYPES,
  UploadedFile as R2File,
} from '../common/upload.utils';
```

(Imported under the alias `R2File` — `mixes.controller.ts` already imports `UploadedFile` as the parameter decorator from `@nestjs/common`, so the type from `upload.utils.ts` needs a different local name to avoid a duplicate-identifier compile error. The decorator usage below, `@UploadedFile()`, is unaffected — only the *type annotation* after each such parameter uses `R2File`.)

Change the local type:

```typescript
type UploadedFilesShape = {
  audio?: Express.Multer.File[];
  cover?: Express.Multer.File[];
};
```

to:

```typescript
type UploadedFilesShape = {
  audio?: R2File[];
  cover?: R2File[];
};
```

In `create()`, change the interceptor's `storage` option and the URL construction:

```typescript
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }], {
      storage: diskStorageByField({ audio: 'audio', cover: 'covers' }),
      fileFilter: fileFilterByField({ audio: AUDIO_MIME_TYPES, cover: IMAGE_MIME_TYPES }),
      limits: { fileSize: 250 * 1024 * 1024 },
    }),
  )
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateMixDto,
    @UploadedFiles() files: UploadedFilesShape,
  ) {
    const audioFile = files.audio?.[0];
    if (!audioFile) {
      throw new BadRequestException('audio file is required');
    }
    const coverFile = files.cover?.[0];

    return this.mixesService.create(userId, dto, {
      audioUrl: `/uploads/audio/${audioFile.filename}`,
      coverUrl: coverFile ? `/uploads/covers/${coverFile.filename}` : undefined,
    });
  }
```

becomes:

```typescript
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }], {
      storage: r2StorageByField({ audio: 'audio', cover: 'covers' }),
      fileFilter: fileFilterByField({ audio: AUDIO_MIME_TYPES, cover: IMAGE_MIME_TYPES }),
      limits: { fileSize: 250 * 1024 * 1024 },
    }),
  )
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateMixDto,
    @UploadedFiles() files: UploadedFilesShape,
  ) {
    const audioFile = files.audio?.[0];
    if (!audioFile) {
      throw new BadRequestException('audio file is required');
    }
    const coverFile = files.cover?.[0];

    return this.mixesService.create(userId, dto, {
      audioUrl: audioFile.key,
      coverUrl: coverFile ? coverFile.key : undefined,
    });
  }
```

In `update()`:

```typescript
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: diskStorageFor('covers'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMixDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const coverUrl = file ? `/uploads/covers/${file.filename}` : undefined;
    return this.mixesService.update(id, userId, dto, coverUrl);
  }
```

becomes:

```typescript
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: r2StorageFor('covers'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMixDto,
    @UploadedFile() file?: R2File,
  ) {
    const coverUrl = file ? file.key : undefined;
    return this.mixesService.update(id, userId, dto, coverUrl);
  }
```

(Note the `@UploadedFile()`-decorated parameter's *type annotation* changes from `Express.Multer.File` to `R2File` — the `@UploadedFile()` decorator name itself, imported from `@nestjs/common`, is unrelated and unchanged. `R2File` is the alias this plan gives `upload.utils.ts`'s `UploadedFile` type on import, precisely to avoid colliding with that decorator's own name.)

- [ ] **Step 2: Update `users.controller.ts`**

Change the import:

```typescript
import { diskStorageFor, fileFilterFor, IMAGE_MIME_TYPES } from '../common/upload.utils';
```

to:

```typescript
import { r2StorageFor, fileFilterFor, IMAGE_MIME_TYPES, UploadedFile as R2File } from '../common/upload.utils';
```

(Aliased to `R2File` for the same reason as in `mixes.controller.ts`: this file already imports `UploadedFile` as the `@nestjs/common` parameter decorator, so the type from `upload.utils.ts` needs a different local name.)

In `uploadAvatar()`:

```typescript
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorageFor('avatars'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@CurrentUserId() userId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('avatar file is required');
    }
    return this.usersService.updateAvatar(userId, `/uploads/avatars/${file.filename}`);
  }
```

becomes:

```typescript
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: r2StorageFor('avatars'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@CurrentUserId() userId: string, @UploadedFile() file?: R2File) {
    if (!file) {
      throw new BadRequestException('avatar file is required');
    }
    return this.usersService.updateAvatar(userId, file.key);
  }
```

In `uploadCover()`:

```typescript
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: diskStorageFor('banners'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadCover(@CurrentUserId() userId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('cover file is required');
    }
    return this.usersService.updateCover(userId, `/uploads/banners/${file.filename}`);
  }
```

becomes:

```typescript
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: r2StorageFor('banners'),
      fileFilter: fileFilterFor(IMAGE_MIME_TYPES),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadCover(@CurrentUserId() userId: string, @UploadedFile() file?: R2File) {
    if (!file) {
      throw new BadRequestException('cover file is required');
    }
    return this.usersService.updateCover(userId, file.key);
  }
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/mixes/mixes.controller.ts backend/src/users/users.controller.ts
git commit -m "$(cat <<'EOF'
Switch mixes and users controllers to R2-backed uploads

Same FileInterceptor/FileFieldsInterceptor usage, swapped to
r2StorageFor/r2StorageByField. Stored URLs are now bare R2 object keys
(file.key) instead of /uploads/... paths built from file.filename.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Remove the now-unused local static file serving

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/package.json`
- Delete: `backend/uploads/` (entire directory)
- Modify: `backend/.gitignore`

**Interfaces:** none — this task only removes code and files nothing else in the plan depends on.

- [ ] **Step 1: Remove `ServeStaticModule` from `app.module.ts`**

Replace the full contents of `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MixesModule } from './mixes/mixes.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MixesModule,
    PlaylistsModule,
    CommentsModule,
  ],
})
export class AppModule {}
```

with:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MixesModule } from './mixes/mixes.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MixesModule,
    PlaylistsModule,
    CommentsModule,
  ],
})
export class AppModule {}
```

(If `app.module.ts` has picked up additional modules beyond `PlaylistsModule`/`CommentsModule` since this plan was written, keep them in the `imports` array exactly as they are — only the `ServeStaticModule` import and its entry in `imports` are removed.)

- [ ] **Step 2: Uninstall the now-unused package**

```bash
cd backend && npm uninstall @nestjs/serve-static
```

- [ ] **Step 3: Delete the local uploads directory**

```bash
cd backend && rm -rf uploads
```

- [ ] **Step 4: Clean up `.gitignore`**

Remove these lines from `backend/.gitignore` (they no longer refer to anything):

```
# Uploaded user content (audio, covers, avatars)
/uploads/*
!/uploads/**/.gitkeep
```

- [ ] **Step 5: Verify it compiles and starts**

```bash
cd backend && npm run build
```

Expected: no errors.

```bash
tail -20 /tmp/backend.log
```

Expected: clean startup, same `Mapped {...}` route lines as before (minus any `/uploads` static-serving log line, if one was ever printed — Nest doesn't log static asset mounts explicitly, so there's likely no visible difference here beyond the absence of errors).

- [ ] **Step 6: Commit**

```bash
git add backend/src/app.module.ts backend/package.json backend/package-lock.json backend/.gitignore
git rm -r backend/uploads
git commit -m "$(cat <<'EOF'
Remove local static file serving now that uploads go to R2

Drops ServeStaticModule and the local uploads/ directory — nothing is
served from local disk anymore. Existing local test files are dev-only
and intentionally not migrated (see plan's Global Constraints).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Frontend `mediaUrl()` now resolves against R2

**Files:**
- Modify: `frontend/src/utils/media.ts`
- Modify: `frontend/.env`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: `import.meta.env.VITE_R2_PUBLIC_URL` (new).
- Produces: `mediaUrl(path)` — same exported function signature as before (`(path: string | null | undefined) => string | undefined`). No caller changes: every component that calls `mediaUrl(mix.coverUrl)`, `mediaUrl(profile.avatarUrl)`, etc. keeps working unchanged, because it was always just passing through whatever string the backend returned — which is now a bare R2 key (`audio/uuid.mp3`) instead of a `/uploads/...` path, and `mediaUrl()` is the only place that knows how to turn either shape into a loadable URL.

- [ ] **Step 1: Add the R2 public URL env var**

Add to `frontend/.env` (the value must match `R2_PUBLIC_URL` used to configure the R2 bucket's public access — coordinate with whatever the manual Cloudflare setup produces; a placeholder is fine until then):

```
VITE_R2_PUBLIC_URL=https://changeme.r2.dev
```

Add the same line (with the same placeholder) to `frontend/.env.example`.

- [ ] **Step 2: Update `mediaUrl()`**

Replace the full contents of `frontend/src/utils/media.ts`:

```typescript
const MEDIA_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/?$/, '') ?? ''

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return `${MEDIA_BASE_URL}${path}`
}
```

with:

```typescript
const MEDIA_BASE_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined) ?? ''

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return `${MEDIA_BASE_URL}/${path}`
}
```

Note the added `/` between `${MEDIA_BASE_URL}` and `${path}` in the return statement: the old `path` values already started with `/` (e.g. `/uploads/audio/...`), but R2 object keys don't (e.g. `audio/uuid.mp3`), so the slash has to come from the template literal now. `VITE_R2_PUBLIC_URL` must **not** have a trailing slash (matches the `R2_PUBLIC_URL` convention documented in the design spec) — that's what keeps this from producing a double slash.

- [ ] **Step 3: Verify types**

```bash
cd frontend && npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/media.ts frontend/.env frontend/.env.example
git commit -m "$(cat <<'EOF'
Point mediaUrl() at R2's public URL instead of the backend origin

Every caller is unchanged — mediaUrl() was always the single place that
turns a stored path into a loadable URL. Object keys from R2 don't carry
a leading slash the way the old /uploads/... paths did, so the slash
now comes from the template literal instead.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Backend integration verification against real R2

**Files:** none (verification only — fix inline in the relevant file from Tasks 1–3 if something fails, then re-run the failing check).

**Precondition:** the manual Cloudflare prerequisite from this plan's Global Constraints must be done — a real `tambouille-dev` R2 bucket, public access enabled, an API token, and the Account ID. If it isn't done yet, stop here and ask the user to complete it; do not proceed on placeholder credentials.

- [ ] **Step 1: Fill in real R2 credentials**

Update `backend/.env` with the real values from the Cloudflare dashboard, replacing the `"changeme"` placeholders from Task 2:

```
R2_ACCOUNT_ID="<real account id>"
R2_ACCESS_KEY_ID="<real access key id>"
R2_SECRET_ACCESS_KEY="<real secret access key>"
R2_BUCKET_NAME="tambouille-dev"
```

Update `frontend/.env`'s `VITE_R2_PUBLIC_URL` with the bucket's real public URL (the `r2.dev` subdomain shown in the Cloudflare dashboard for that bucket).

- [ ] **Step 2: Restart both dev servers so they pick up the new env values**

```bash
pkill -f "nest start" 2>/dev/null
cd backend && (npm run start:dev &> /tmp/backend.log &) ; disown
```

Wait a few seconds, then confirm it started cleanly:

```bash
sleep 4 && tail -20 /tmp/backend.log
```

Expected: clean startup, no errors.

Restart the frontend dev server the same way if it doesn't pick up the new `.env` automatically (Vite dev servers generally require a restart after `.env` changes):

```bash
pkill -f "vite" 2>/dev/null
cd frontend && (npm run dev &> /tmp/frontend.log &) ; disown
sleep 3 && tail -10 /tmp/frontend.log
```

- [ ] **Step 3: Upload an avatar via curl and confirm it lands on R2**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"emailOrUsername":"djnelly","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
```

(If `djnelly`/`password123` doesn't exist in this environment, register a fresh test account first via `POST /api/auth/register`, the same way every prior feature in this project was tested.)

```bash
curl -s -o /tmp/test-avatar.jpg -w "download:%{http_code}\n" "https://picsum.photos/200"
curl -s -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/tmp/test-avatar.jpg;type=image/jpeg"
```

Expected: `STATUS:200`, JSON response with `avatarUrl` set to something like `avatars/3f2e...-1a2b.jpg` (no `/uploads` prefix, no leading slash).

- [ ] **Step 4: Confirm the returned key actually resolves to a loadable file on R2**

Take the `avatarUrl` value from Step 3's response and, using the same `R2_PUBLIC_URL` from `.env`:

```bash
curl -sI "https://<your-r2-public-url>/<avatarUrl-from-step-3>"
```

Expected: `HTTP/1.1 200` (or `200 OK`), with a `content-type: image/jpeg` header.

- [ ] **Step 5: Upload a mix (audio + cover) via curl and confirm both keys resolve**

```bash
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=2" -q:a 9 /tmp/test-mix.mp3 2>&1 | tail -3
curl -s -w "\nSTATUS:%{http_code}\n" -X POST http://localhost:3000/api/mixes \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=R2 upload test" \
  -F "audio=@/tmp/test-mix.mp3;type=audio/mpeg" \
  -F "cover=@/tmp/test-avatar.jpg;type=image/jpeg"
```

Expected: `STATUS:201`, JSON response with `audioUrl` like `audio/....mp3` and `coverUrl` like `covers/....jpg`. Confirm both resolve the same way as Step 4 (`curl -sI` on each, expect `200`).

- [ ] **Step 6: If any step didn't match its expectation, fix the relevant file from Tasks 1–3 and re-run that step.** No separate commit needed unless a fix was required — then commit that fix with a message describing what was wrong.

---

### Task 7: Browser verification pass

**Files:** none (verification only).

- [ ] **Step 1: Upload a mix through the UI**

Go to `/upload`, fill in a title, pick an audio file and a cover image, submit. Confirm the resulting mix detail page shows the cover image and the audio plays — both loading straight from the R2 public URL (check the browser's network tab: the audio/cover request URLs should be the `VITE_R2_PUBLIC_URL` domain, not `localhost:3000`).

- [ ] **Step 2: Update a profile avatar and cover/banner through the UI**

On your own profile page, change the avatar and the cover/banner image. Confirm both render immediately after upload and on a subsequent page reload.

- [ ] **Step 3: Confirm an existing mix's cover/audio still renders**

Any mix created during Task 6's curl pass should still display correctly when viewed in the browser (its cover image, its playable audio) — this exercises the same `mediaUrl()` path as normal browsing, not just the upload flow.

- [ ] **Step 4: If anything doesn't render, check the browser console/network tab for the failing request's URL first** — a wrong `VITE_R2_PUBLIC_URL` (trailing slash, wrong subdomain) is the most likely culprit given Task 5's implementation. Fix `frontend/.env`, restart the frontend dev server, and re-check. No commit needed for an `.env` value fix (`.env` isn't tracked by git) unless `.env.example`'s placeholder also needs correcting.

---

## Summary of new/changed files

| File | Change |
|---|---|
| `backend/src/main.ts` | Add `import 'dotenv/config'` as the first line |
| `backend/package.json` | `dotenv` moved to dependencies; add `@aws-sdk/client-s3`, `multer-s3`; remove `@nestjs/serve-static` |
| `backend/.env`, `backend/.env.example` | Add `R2_*` vars; remove unused `UPLOADS_DIR`/`MAX_UPLOAD_SIZE_MB` |
| `backend/src/common/upload.utils.ts` | `diskStorageFor`/`diskStorageByField` → `r2StorageFor`/`r2StorageByField`; new `UploadedFile` type |
| `backend/src/mixes/mixes.controller.ts` | Use R2 storage; `file.key` instead of `/uploads/.../${file.filename}` |
| `backend/src/users/users.controller.ts` | Same, for avatar and cover/banner uploads |
| `backend/src/app.module.ts` | Remove `ServeStaticModule` |
| `backend/uploads/` | Deleted |
| `backend/.gitignore` | Remove now-irrelevant `/uploads/*` entries |
| `frontend/src/utils/media.ts` | `mediaUrl()` resolves against `VITE_R2_PUBLIC_URL` instead of the backend origin |
| `frontend/.env`, `frontend/.env.example` | Add `VITE_R2_PUBLIC_URL` |
