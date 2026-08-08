# Multi-source import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user import a mix from Archive.org or a podcast RSS feed by pasting a URL, with the audio played from where it already lives.

**Architecture:** `Mix.mixcloudKey` is replaced by a `sourceType`/`sourceRef` pair so the "exactly one audio source" invariant stops growing a column per site. A `SourceImporter` interface with one module per source turns a pasted URL into either one mix or a list to choose from. The server fetches only the source document and the cover — never the audio, which the browser plays directly through the existing `<audio>` element — and both server fetches go through one hardened `safeFetch` helper.

**Tech Stack:** NestJS 11, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, Jest + ts-jest, Vue 3 + TypeScript + Vite.

**Spec:** `docs/superpowers/specs/2026-08-08-multi-source-import-design.md`

## Global Constraints

- Backend tests live beside their source as `*.spec.ts` (`jest.rootDir` is `src`). Run one with `npm test -- <path-relative-to-src>`.
- No integration test may call Archive.org, Mixcloud or a live feed. Network shapes are frozen as fixtures.
- `sourceType` is a plain string, never a Prisma enum. Known values: `'mixcloud'`, `'remote'`.
- Every server-side fetch of a user-supplied URL goes through `safeFetch`. No bare `fetch` on a user-supplied URL anywhere.
- A blocked address returns the same user-facing message whatever the reason, so the form cannot be used to probe the internal network.
- The audio is never fetched, proxied or copied by the server.
- Prisma migrations in this repo are hand-written SQL in `prisma/migrations/<UTC-timestamp>_<name>/migration.sql`. Follow that; do not let `prisma migrate dev` author the SQL.
- User-facing strings are French. Code comments follow the surrounding file.

---

## File Structure

**Created:**
- `backend/src/common/safe-fetch.ts` — the single hardened fetch: https-only, private-address refusal, manual redirects, size and time caps.
- `backend/src/common/safe-fetch.spec.ts`
- `backend/src/imports/source-importer.ts` — the `SourceImporter` interface and shared payload types.
- `backend/src/imports/imports.service.ts` — dispatch across importers.
- `backend/src/imports/imports.controller.ts` — `POST /imports/resolve`, `POST /imports/item`.
- `backend/src/imports/imports.module.ts`
- `backend/src/imports/archive.importer.ts` + `.spec.ts`
- `backend/src/imports/podcast.importer.ts` + `.spec.ts`
- `backend/src/imports/mixcloud.importer.ts` — wraps the existing `MixcloudService`.
- `backend/src/imports/__fixtures__/archive-item.json`
- `backend/src/imports/__fixtures__/podcast-feed.xml`
- `backend/prisma/migrations/20260809000000_multi_source_audio/migration.sql`

**Modified:**
- `backend/prisma/schema.prisma` — the `Mix` model.
- `backend/src/mixes/mixes.service.ts:75` — the invariant, `create`, `update`, `registerPlay`.
- `backend/src/mixes/dto/create-mix.dto.ts`, `update-mix.dto.ts`
- `backend/src/mixes/mixes.controller.ts:148` — the early gate; cover import becomes best-effort.
- `backend/src/mixcloud/cover-source.ts` — host allow-list replaced by `safeFetch`.
- `backend/src/app.module.ts` — register `ImportsModule`.
- `frontend/src/types/index.ts` — `Mix`, plus the import payload types.
- `frontend/src/components/PlayerBar.vue` — engine selection on `sourceType`, `@error` on `<audio>`.
- `frontend/src/views/UploadView.vue` — paste-a-URL flow.
- `frontend/src/views/MixDetailView.vue` — source name and link.

Phase 1 (Tasks 1–3) is shippable on its own: nothing changes for a user, and Mixcloud keeps working. Phase 2 (4–8) is backend-only. Phase 3 (9–10) makes it visible.

---

## Task 1: Migrate `mixcloudKey` to a source pair

**Files:**
- Create: `backend/prisma/migrations/20260809000000_multi_source_audio/migration.sql`
- Modify: `backend/prisma/schema.prisma:67-97`

**Interfaces:**
- Produces: `Mix.sourceType: String?` and `Mix.sourceRef: String?` on the Prisma client; `Mix.mixcloudKey` no longer exists.

- [ ] **Step 1: Write the migration SQL**

Create `backend/prisma/migrations/20260809000000_multi_source_audio/migration.sql`:

```sql
-- `mixcloudKey` answered one question — "where is the audio" — for one site.
-- The pair answers it for any site: `sourceType` says which player engine,
-- `sourceRef` says what to hand it. Backfill first, drop second, so the
-- statement is reversible up to the point the column goes.
ALTER TABLE "mixes" ADD COLUMN "sourceType" TEXT,
                    ADD COLUMN "sourceRef" TEXT;

UPDATE "mixes"
   SET "sourceType" = 'mixcloud',
       "sourceRef"  = "mixcloudKey"
 WHERE "mixcloudKey" IS NOT NULL;

ALTER TABLE "mixes" DROP COLUMN "mixcloudKey";
```

- [ ] **Step 2: Update the Prisma model**

In `backend/prisma/schema.prisma`, replace the `mixcloudKey` field in `model Mix`:

```prisma
  // Exactly one audio source: either `audioUrl` alone, or `sourceType` and
  // `sourceRef` together. Prisma cannot express that, so `MixesService`
  // enforces it on create and update.
  /// R2 object key. Null when the audio lives elsewhere.
  audioUrl     String?
  /// 'mixcloud' | 'remote'. Null when the audio is on R2. A plain string, not
  /// an enum: adding a source must not need a migration.
  sourceType   String?
  /// Interpreted according to `sourceType`: a cloudcast key
  /// ("/Notamusic/antimythes/") or a directly playable audio URL.
  sourceRef    String?
```

- [ ] **Step 3: Apply the migration and regenerate the client**

Run: `cd backend && npx prisma migrate deploy && npx prisma generate`
Expected: `1 migration found` then `Generated Prisma Client`.

- [ ] **Step 4: Verify the backfill on real data**

Run:
```bash
cd backend && npx prisma db execute --stdin <<'SQL'
SELECT "sourceType", count(*) FROM "mixes" GROUP BY "sourceType";
SQL
```
Expected: every row that previously had a `mixcloudKey` now reads `mixcloud`; the rest read `NULL`. No row has a non-null `sourceType` with a null `sourceRef`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma
git commit -m "feat(db): remplace mixcloudKey par un couple sourceType/sourceRef"
```

---

## Task 2: Teach the backend the source pair

**Files:**
- Modify: `backend/src/mixes/mixes.service.ts:75-82` (invariant), `:122-147` (create), `:223-227` (update), `:382-396` (registerPlay)
- Modify: `backend/src/mixes/dto/create-mix.dto.ts`, `backend/src/mixes/dto/update-mix.dto.ts`
- Modify: `backend/src/mixes/mixes.controller.ts:148`
- Test: `backend/src/mixes/mixes.service.spec.ts`

**Interfaces:**
- Consumes: `Mix.sourceType` / `Mix.sourceRef` from Task 1.
- Produces: `assertExactlyOneAudioSource(audioUrl: string | null, sourceType: string | null, sourceRef: string | null): void` — exported from `mixes.service.ts`, imported by `mixes.controller.ts`.
- Produces: `CreateMixDto.sourceType?: string`, `CreateMixDto.sourceRef?: string` (same two fields on `UpdateMixDto`).

- [ ] **Step 1: Write the failing test**

Append to `backend/src/mixes/mixes.service.spec.ts`:

```ts
import { assertExactlyOneAudioSource } from './mixes.service';

describe('assertExactlyOneAudioSource', () => {
  const valid: [string | null, string | null, string | null][] = [
    ['audio/abc.mp3', null, null],
    [null, 'mixcloud', '/Notamusic/antimythes/'],
    [null, 'remote', 'https://archive.org/download/x/y.mp3'],
  ];
  it.each(valid)('accepts audioUrl=%s type=%s ref=%s', (audioUrl, type, ref) => {
    expect(() => assertExactlyOneAudioSource(audioUrl, type, ref)).not.toThrow();
  });

  const invalid: [string, string | null, string | null, string | null][] = [
    ['no source at all', null, null, null],
    ['both sources', 'audio/abc.mp3', 'remote', 'https://example.org/x.mp3'],
    ['half a pair: type without ref', null, 'remote', null],
    ['half a pair: ref without type', null, null, 'https://example.org/x.mp3'],
  ];
  it.each(invalid)('rejects %s', (_label, audioUrl, type, ref) => {
    expect(() => assertExactlyOneAudioSource(audioUrl, type, ref)).toThrow(BadRequestException);
  });
});
```

Add `import { BadRequestException } from '@nestjs/common';` to the file's imports if absent.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npm test -- mixes/mixes.service.spec.ts`
Expected: FAIL — `assertExactlyOneAudioSource` takes 2 arguments, and the half-pair cases are not rejected.

- [ ] **Step 3: Rewrite the invariant**

Replace `assertExactlyOneAudioSource` in `backend/src/mixes/mixes.service.ts`:

```ts
/**
 * A mix carries exactly one audio source: an R2 object key, or a
 * `sourceType`/`sourceRef` pair naming somewhere else. Prisma cannot express
 * that, so the rule lives here — the single door every write goes through.
 *
 * Three states are refusable and each gets its own message, because each is
 * something a caller can genuinely ask for: with no source the mix is
 * unplayable; with both it is ambiguous about which the player should use;
 * with half a pair it names a player engine with nothing to hand it.
 *
 * Exported so `MixesController` can reject a hopeless create *before* it
 * imports a cover into R2, which nothing in this codebase can delete. That
 * early call is a cheap gate in front of this rule, never a replacement for
 * it: this remains the guarantee for every caller, including later ones.
 */
export function assertExactlyOneAudioSource(
  audioUrl: string | null,
  sourceType: string | null,
  sourceRef: string | null,
): void {
  if (Boolean(sourceType) !== Boolean(sourceRef)) {
    throw new BadRequestException('A remote source needs both sourceType and sourceRef');
  }
  const hasRemote = Boolean(sourceType);
  if (!audioUrl && !hasRemote) {
    throw new BadRequestException('A mix must have either an audio file or a remote source');
  }
  if (audioUrl && hasRemote) {
    throw new BadRequestException('A mix cannot have both an audio file and a remote source');
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npm test -- mixes/mixes.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Thread the pair through create, update and registerPlay**

In `create` (around `mixes.service.ts:129`):

```ts
    const audioUrl = files.audioUrl || null;
    const sourceType = dto.sourceType || null;
    const sourceRef = dto.sourceRef || null;
    assertExactlyOneAudioSource(audioUrl, sourceType, sourceRef);
```

and in the `data` object, replace `mixcloudKey,` with:

```ts
        sourceType,
        sourceRef,
        // Archive.org reports each file's length and an RSS item carries
        // <itunes:duration>, so an imported mix knows its own duration where an
        // uploaded one does not (nothing probes the file server-side). This is
        // what lights up "1 h 12 · 18 morceaux" in the feed.
        durationSec: dto.durationSec ?? null,
```

In `update` (around `:223`), replace the `dto.mixcloudKey` block:

```ts
    // Update never touches `audioUrl` — this route accepts no audio upload —
    // so the rule is checked against the state the write would leave behind.
    // That refuses both conversions, which are out of scope, while still
    // letting a remotely-hosted mix correct a mistyped reference.
    if (dto.sourceType !== undefined || dto.sourceRef !== undefined) {
      const sourceType = (dto.sourceType ?? mix.sourceType) || null;
      const sourceRef = (dto.sourceRef ?? mix.sourceRef) || null;
      assertExactlyOneAudioSource(mix.audioUrl, sourceType, sourceRef);
      data.sourceType = sourceType;
      data.sourceRef = sourceRef;
    }
```

In `registerPlay` (around `:382`), replace `select: { mixcloudKey: true }` with `select: { sourceType: true }` and `if (!mix.mixcloudKey)` with `if (!mix.sourceType)`. The comment above it explains that plays on a mix hosted elsewhere are counted by that host; it still holds, so widen "Mixcloud" to "the host" in its wording.

- [ ] **Step 6: Replace the DTO fields**

In both `create-mix.dto.ts` and `update-mix.dto.ts`, replace the `mixcloudKey` field with:

```ts
  /**
   * Which player engine the audio needs: 'mixcloud' or 'remote'. Paired with
   * `sourceRef`; `MixesService` refuses one without the other.
   */
  @IsOptional()
  @IsString()
  @IsIn(['mixcloud', 'remote'])
  sourceType?: string;

  /**
   * What `sourceType` lets us interpret: a cloudcast key, or an https URL to a
   * directly playable audio file.
   *
   * A cloudcast key is later interpolated into a Mixcloud URL, so it must
   * satisfy the relay's own guard — the pattern is imported, never restated.
   * A remote URL is never fetched by the server, but it is served to every
   * visitor's browser, so it is held to https and to a public address.
   *
   * An empty string is deliberately let through instead of being rejected
   * here, so the service can name the real problem — no audio source at all —
   * rather than answering a blank field with a regex.
   */
  @ValidateIf((dto: { sourceType?: string; sourceRef?: string }) => Boolean(dto.sourceRef))
  @IsString()
  @MaxLength(2048)
  @Validate(SourceRefConstraint)
  sourceRef?: string;

  /**
   * Duration in seconds, when the source reported one. Multipart bodies carry
   * everything as text, so this arrives as a string and needs coercing.
   * Absent for a hand-filled upload: nothing probes the audio server-side.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 3600)
  durationSec?: number;
```

Add to the imports: `import { IsIn, IsInt, Max, Min, Validate } from 'class-validator';`, `import { Type } from 'class-transformer';` and `import { SourceRefConstraint } from './source-ref.constraint';`. `UpdateMixDto` takes `sourceType` and `sourceRef` only — a duration is a property of the source, not something an edit form should retype.

- [ ] **Step 7: Write the `sourceRef` validator**

Create `backend/src/mixes/dto/source-ref.constraint.ts`:

```ts
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { KEY_PATTERN as MIXCLOUD_KEY_PATTERN } from '../../mixcloud/mixcloud.service';
import { isIP } from 'node:net';

/**
 * `sourceRef` means two different things depending on `sourceType`, so it
 * cannot be checked by one regex. Validation dispatches on the sibling field.
 *
 * The remote branch does not resolve DNS — validators are synchronous, and a
 * lookup here would make every create wait on the network. It refuses a
 * literal IP address outright: no legitimate podcast or archive serves audio
 * from a bare address, so allowing them would only buy a way to point every
 * visitor's browser at an arbitrary host.
 */
@ValidatorConstraint({ name: 'sourceRef', async: false })
export class SourceRefConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;
    const sourceType = (args.object as { sourceType?: string }).sourceType;

    if (sourceType === 'mixcloud') return MIXCLOUD_KEY_PATTERN.test(value);

    if (sourceType === 'remote') {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return false;
      }
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.replace(/^\[|\]$/g, '');
      if (isIP(host)) return false;
      return true;
    }

    return false;
  }

  defaultMessage(): string {
    return 'sourceRef is not valid for this sourceType';
  }
}
```

- [ ] **Step 7b: Test the validator**

Create `backend/src/mixes/dto/source-ref.constraint.spec.ts`:

```ts
import { SourceRefConstraint } from './source-ref.constraint';

const check = (sourceType: string | undefined, sourceRef: string) =>
  new SourceRefConstraint().validate(sourceRef, { object: { sourceType } } as never);

describe('SourceRefConstraint', () => {
  it('accepts a valid cloudcast key when the type is mixcloud', () => {
    expect(check('mixcloud', '/Notamusic/antimythes/')).toBe(true);
  });
  it('refuses a URL when the type is mixcloud', () => {
    expect(check('mixcloud', 'https://example.org/a.mp3')).toBe(false);
  });
  it('accepts an https URL when the type is remote', () => {
    expect(check('remote', 'https://archive.org/download/x/y.mp3')).toBe(true);
  });
  it.each([
    'http://archive.org/download/x/y.mp3',
    'https://192.168.1.1/y.mp3',
    'https://[::1]/y.mp3',
    'not a url',
  ])('refuses %s when the type is remote', (value) => {
    expect(check('remote', value)).toBe(false);
  });
  it('refuses anything when the type is missing', () => {
    expect(check(undefined, 'https://archive.org/download/x/y.mp3')).toBe(false);
  });
});
```

Run: `cd backend && npm test -- mixes/dto/source-ref.constraint.spec.ts`
Expected: PASS.

- [ ] **Step 8: Update the controller's early gate**

In `backend/src/mixes/mixes.controller.ts:148`:

```ts
    assertExactlyOneAudioSource(
      audioFile?.key ?? null,
      dto.sourceType || null,
      dto.sourceRef || null,
    );
```

The long comment above it still applies word for word; only "a `mixcloudKey`" becomes "a remote source".

- [ ] **Step 9: Run the whole backend suite**

Run: `cd backend && npm test`
Expected: PASS. Any spec still writing `mixcloudKey` is updated to the pair.

- [ ] **Step 10: Commit**

```bash
git add backend/src
git commit -m "feat(mixes): généralise la source audio en couple sourceType/sourceRef"
```

---

## Task 3: Follow the rename through the frontend

**Files:**
- Modify: `frontend/src/types/index.ts:33-52`
- Modify: `frontend/src/components/PlayerBar.vue:29-39`, `:407-425`
- Modify: `frontend/src/views/UploadView.vue`

**Interfaces:**
- Consumes: the API now returns `sourceType` / `sourceRef` on every `Mix`.
- Produces: `Mix.sourceType: string | null`, `Mix.sourceRef: string | null` in `frontend/src/types/index.ts`.

- [ ] **Step 1: Update the `Mix` type**

In `frontend/src/types/index.ts`, replace the `mixcloudKey` line:

```ts
  /** R2 object key. Null when the audio lives elsewhere. */
  audioUrl: string | null
  /** `'mixcloud' | 'remote'`. Null when the audio is on R2. */
  sourceType: string | null
  /** Cloudcast key, or a directly playable audio URL. Null when the audio is on R2. */
  sourceRef: string | null
```

- [ ] **Step 2: Update `PlayerBar`'s source computeds**

In `frontend/src/components/PlayerBar.vue`, replace the `mixcloudKey` computed (`:31`):

```ts
/** Cloudcast key. Null unless this mix plays through the Mixcloud widget. */
const mixcloudKey = computed(() =>
  playerStore.currentMix?.sourceType === 'mixcloud' ? playerStore.currentMix.sourceRef : null,
)
/**
 * A directly playable URL: R2 goes through `mediaUrl`, anything else is already
 * absolute. Both end up on the same `<audio>` element — the point of the
 * source pair is that only Mixcloud needs its own engine.
 */
const audioSrc = computed(() => {
  const mix = playerStore.currentMix
  if (!mix) return undefined
  if (mix.sourceType === 'remote') return mix.sourceRef ?? undefined
  return mediaUrl(mix.audioUrl)
})
```

`hasNoSource` and `canPlay` below are unchanged — they already read from these two.

- [ ] **Step 3: Update `UploadView`'s submit payload**

In `frontend/src/views/UploadView.vue`, wherever `importedMixcloudKey` is appended to the `FormData` on submit, send the pair instead:

```ts
  if (importedMixcloudKey.value && keepAudioOnMixcloud.value) {
    formData.append('sourceType', 'mixcloud')
    formData.append('sourceRef', importedMixcloudKey.value)
  }
```

- [ ] **Step 4: Type-check and build**

Run: `cd frontend && npm run type-check && npm run build`
Expected: both pass, no reference to `mixcloudKey` remains.

Run: `grep -rn "mixcloudKey" frontend/src backend/src` — expected: only inside `backend/src/mixcloud/` (the relay's own vocabulary) and `backend/src/imports/mixcloud.importer.ts` later.

- [ ] **Step 5: Verify in the browser**

Start the preview, play an R2-hosted mix and a Mixcloud-hosted mix. Expected: both play, the bottom bar shows title and elapsed time for each.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): lit la source audio depuis sourceType/sourceRef"
```

---

## Task 4: The hardened fetch

**Files:**
- Create: `backend/src/common/safe-fetch.ts`
- Test: `backend/src/common/safe-fetch.spec.ts`

**Interfaces:**
- Produces: `isBlockedAddress(ip: string): boolean`
- Produces: `readCappedBody(response: Response, maxBytes: number): Promise<Buffer>` — moved here from `cover-source.ts`.
- Produces: `safeFetch(rawUrl: string, options: { maxBytes: number; timeoutMs: number; accept?: string }): Promise<{ url: URL; contentType: string; body: Buffer }>`
- Produces: `BLOCKED_ADDRESS_MESSAGE: string` — the one message every refusal uses.

- [ ] **Step 1: Add `undici` as an explicit dependency**

Run: `cd backend && npm install undici`

Node's global `fetch` is undici under the hood, but the `Agent` needed to validate the address actually connected to is not exposed from `node:*`. Without it the check runs on a hostname and a DNS rebinding walks straight through.

- [ ] **Step 2: Write the failing address test**

Create `backend/src/common/safe-fetch.spec.ts`:

```ts
import { isBlockedAddress } from './safe-fetch';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '127.9.9.9', '10.0.0.1', '10.255.255.254',
    '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.255.255',
    '193.51.196.1', '2001:4860:4860::8888', '::ffff:8.8.8.8',
  ])('allows %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});
```

`172.15.255.255` and `172.32.0.1` sit either side of `172.16/12`; they are there because that range is the one people get wrong.

- [ ] **Step 3: Run it to verify it fails**

Run: `cd backend && npm test -- common/safe-fetch.spec.ts`
Expected: FAIL — `Cannot find module './safe-fetch'`.

- [ ] **Step 4: Implement the address check**

Create `backend/src/common/safe-fetch.ts`:

```ts
import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent } from 'undici';

/**
 * Fetching a URL the user chose is a request-forgery primitive. Everything in
 * this file exists to fence it in, and it is the only door such a fetch goes
 * through.
 */

/** Every refusal says this, whatever the reason. Telling "private host" apart
 *  from "no such host" would turn the import form into a network scanner. */
export const BLOCKED_ADDRESS_MESSAGE = "Cette adresse n'est pas accessible depuis Tambouille";

const MAX_REDIRECTS = 3;

/** base/bits pairs, in the notation people actually check them against. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => ((acc << 8) >>> 0) + Number(part), 0) >>> 0;
}

/** True for anything that is not a public unicast address — including inputs
 *  that are not addresses at all, which are refused rather than guessed at. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) {
    const value = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = (0xffffffff << (32 - bits)) >>> 0;
      return ((value & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
    });
  }

  if (family === 6) {
    const lower = ip.toLowerCase();
    // `::ffff:10.0.0.1` is an IPv4 address wearing an IPv6 coat: unwrap it,
    // or every v4 rule above is bypassed by spelling the address differently.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isBlockedAddress(mapped[1]!);
    if (lower === '::1' || lower === '::') return true;
    const head = Number.parseInt(lower.split(':')[0] || '0', 16);
    if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    return false;
  }

  return true;
}
```

- [ ] **Step 5: Run the address test to verify it passes**

Run: `cd backend && npm test -- common/safe-fetch.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit the address check**

```bash
git add backend/src/common/safe-fetch.ts backend/src/common/safe-fetch.spec.ts backend/package.json backend/package-lock.json
git commit -m "feat(common): refuse les adresses non publiques avant toute requête sortante"
```

- [ ] **Step 7: Write the failing `safeFetch` test**

Append to `backend/src/common/safe-fetch.spec.ts`:

```ts
import { safeFetch, BLOCKED_ADDRESS_MESSAGE } from './safe-fetch';
import { BadRequestException } from '@nestjs/common';

describe('safeFetch', () => {
  it('refuses http', async () => {
    await expect(safeFetch('http://example.org/feed.xml', { maxBytes: 1000, timeoutMs: 100 }))
      .rejects.toThrow(BadRequestException);
  });

  it('refuses a literal private address', async () => {
    await expect(safeFetch('https://169.254.169.254/latest/meta-data/', { maxBytes: 1000, timeoutMs: 100 }))
      .rejects.toThrow(BLOCKED_ADDRESS_MESSAGE);
  });

  it('refuses a malformed URL', async () => {
    await expect(safeFetch('not a url', { maxBytes: 1000, timeoutMs: 100 }))
      .rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `cd backend && npm test -- common/safe-fetch.spec.ts`
Expected: FAIL — `safeFetch is not a function`.

- [ ] **Step 9: Implement `safeFetch`**

Append to `backend/src/common/safe-fetch.ts`:

```ts
/**
 * Validates the address undici is about to connect to, not the hostname it
 * was given. Between a DNS answer and a connection the answer can change; this
 * runs on the far side of that gap.
 */
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, '', 0);
        const safe = (addresses as { address: string; family: number }[]).filter(
          (entry) => !isBlockedAddress(entry.address),
        );
        if (safe.length === 0) return callback(new Error(BLOCKED_ADDRESS_MESSAGE), '', 0);
        // Cast: undici's callback accepts the `all: true` array form, which
        // its published types express less precisely than `dns.lookup` does.
        (callback as unknown as (e: null, a: unknown) => void)(null, safe);
      });
    },
  },
});

function assertFetchableUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException("Cette adresse n'est pas une URL valide");
  }
  if (url.protocol !== 'https:') {
    // Not a matter of principle: a browser blocks http audio on an https page,
    // so an http source yields an unplayable mix. Refuse it where it can be
    // explained rather than at playback, where it cannot.
    throw new BadRequestException('La source doit être en https');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isBlockedAddress(host)) {
    throw new BadRequestException(BLOCKED_ADDRESS_MESSAGE);
  }
  return url;
}

/** Reads the body, aborting as soon as it exceeds `maxBytes`. */
export async function readCappedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new BadGatewayException('La source a renvoyé un corps vide');

  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BadRequestException('La réponse de la source dépasse la taille autorisée');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches a user-supplied URL under every guard in this file.
 *
 * Redirects are followed by hand rather than with `redirect: 'follow'`, because
 * each hop must be re-validated — the guards mean nothing if hop 2 lands on
 * `169.254.169.254`. They are followed at all, unlike the Mixcloud relay's
 * `redirect: 'error'`, because podcast hosts redirect constantly and refusing
 * would fail on real feeds.
 *
 * The deadline covers the whole exchange, body included: cleared once headers
 * land, a host that answers and then stalls would hold the request open, and
 * the size cap would never trip because a stalled body sends no bytes to count.
 */
export async function safeFetch(
  rawUrl: string,
  options: { maxBytes: number; timeoutMs: number; accept?: string },
): Promise<{ url: URL; contentType: string; body: Buffer }> {
  let url = assertFetchableUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          signal: controller.signal,
          redirect: 'manual',
          headers: options.accept ? { accept: options.accept } : {},
          // @ts-expect-error `dispatcher` is undici's, absent from lib.dom's RequestInit
          dispatcher: guardedAgent,
        });
      } catch (err) {
        // The guarded lookup rejects by throwing, and its message is the only
        // one a caller may see about an address.
        if (err instanceof Error && err.message === BLOCKED_ADDRESS_MESSAGE) {
          throw new BadRequestException(BLOCKED_ADDRESS_MESSAGE);
        }
        throw new BadGatewayException('La source est injoignable');
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) throw new BadGatewayException('La source a renvoyé une redirection vide');
        url = assertFetchableUrl(new URL(location, url).toString());
        continue;
      }

      if (response.status === 404) {
        // Kept distinct from 502 all the way up, so a caller can tell "no such
        // item" from "the source is down" — the split the Mixcloud relay
        // already makes, and the one users notice.
        throw new NotFoundException("Cette source n'existe pas");
      }
      if (!response.ok) {
        throw new BadGatewayException(`La source a répondu ${response.status}`);
      }

      const contentType = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > options.maxBytes) {
        throw new BadRequestException('La réponse de la source dépasse la taille autorisée');
      }

      return { url, contentType, body: await readCappedBody(response, options.maxBytes) };
    }

    throw new BadGatewayException('Trop de redirections');
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cd backend && npm test -- common/safe-fetch.spec.ts`
Expected: PASS. The three `safeFetch` cases all fail before any socket opens, so they run offline.

- [ ] **Step 11: Commit**

```bash
git add backend/src/common/safe-fetch.ts backend/src/common/safe-fetch.spec.ts
git commit -m "feat(common): safeFetch — https, redirections revalidées, plafonds"
```

---

## Task 5: Route the cover fetch through `safeFetch`

**Files:**
- Modify: `backend/src/mixcloud/cover-source.ts`
- Modify: `backend/src/mixcloud/cover-source.spec.ts`
- Modify: `backend/src/mixes/cover-import.service.ts`
- Modify: `backend/src/mixes/mixes.controller.ts:153-155`

**Interfaces:**
- Consumes: `safeFetch`, `readCappedBody` from Task 4.
- Produces: `fetchCover(rawUrl: string): Promise<FetchedCover>` — replaces `fetchMixcloudCover`, no host allow-list.
- Produces: `CoverImportService.importFromUrl(url: string): Promise<string | null>` — now returns `null` instead of throwing.

- [ ] **Step 1: Rewrite the cover fetch**

Replace the whole body of `backend/src/mixcloud/cover-source.ts` with:

```ts
import { BadRequestException } from '@nestjs/common';
import { COVER_MAX_BYTES, IMAGE_EXTENSIONS, IMAGE_MIME_TYPES } from '../common/mime.constants';
import { safeFetch } from '../common/safe-fetch';

/**
 * This used to accept only `.mixcloud.com` hosts. That allow-list cannot
 * survive "import from any feed", so it is replaced by `safeFetch`'s address
 * check — the one guard this feature deliberately widens. Everything else is
 * unchanged: https, the size cap, and the MIME allow-list below.
 */

const COVER_FETCH_TIMEOUT_MS = 10_000;

export interface FetchedCover {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

export async function fetchCover(rawUrl: string): Promise<FetchedCover> {
  const { contentType, body } = await safeFetch(rawUrl, {
    maxBytes: COVER_MAX_BYTES,
    timeoutMs: COVER_FETCH_TIMEOUT_MS,
    accept: 'image/*',
  });

  if (!IMAGE_MIME_TYPES.includes(contentType)) {
    throw new BadRequestException(`Type de pochette non pris en charge : ${contentType || 'inconnu'}`);
  }

  return { buffer: body, contentType, extension: IMAGE_EXTENSIONS[contentType]! };
}
```

Move the file to `backend/src/common/cover-source.ts` (it is no longer Mixcloud's), and update the import in `cover-import.service.ts`.

- [ ] **Step 2: Update the cover spec**

In the moved `cover-source.spec.ts`, delete every test asserting the `.mixcloud.com` host rule — that rule is gone by design. Keep and re-point the MIME tests. Add:

```ts
it('refuses an image on a private address', async () => {
  await expect(fetchCover('https://192.168.1.1/cover.jpg')).rejects.toThrow(BLOCKED_ADDRESS_MESSAGE);
});
```

- [ ] **Step 3: Make the cover import best-effort**

Replace `backend/src/mixes/cover-import.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { fetchCover } from '../common/cover-source';
import { putBufferToR2 } from '../common/upload.utils';

/**
 * Imports the cover the user picked at the source. The fetch happens here, at
 * mix creation, rather than at import time: the mix does not exist until the
 * user submits the form.
 *
 * A failure returns null rather than throwing. A missing cover is an
 * annoyance; a refused create is lost work — and the audio has already been
 * streamed to R2 by then, so failing here would strand an object nothing
 * deletes.
 */
@Injectable()
export class CoverImportService {
  private readonly logger = new Logger(CoverImportService.name);

  /** The R2 object key the cover was stored under, or null if it could not be fetched. */
  async importFromUrl(coverSourceUrl: string): Promise<string | null> {
    try {
      const cover = await fetchCover(coverSourceUrl);
      return await putBufferToR2('covers', cover.buffer, cover.contentType, cover.extension);
    } catch (err) {
      this.logger.warn(`Pochette non importée depuis ${coverSourceUrl}: ${String(err)}`);
      return null;
    }
  }
}
```

In `mixes.controller.ts:153`, the call site already assigns into `let coverUrl`, so a `null` result simply leaves the mix without a cover. Change `coverUrl = await this.coverImportService.importFromUrl(dto.coverSourceUrl)` to `coverUrl = (await this.coverImportService.importFromUrl(dto.coverSourceUrl)) ?? undefined`.

- [ ] **Step 4: Run the suite**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "feat(covers): fetch générique sous safeFetch, import best-effort"
```

---

## Task 6: The importer interface and the `/imports` routes

**Files:**
- Create: `backend/src/imports/source-importer.ts`, `imports.service.ts`, `imports.controller.ts`, `imports.module.ts`, `mixcloud.importer.ts`
- Test: `backend/src/imports/imports.service.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces:

```ts
export interface SourceItem {
  ref: string;
  title: string;
  durationSec?: number;
  coverUrl?: string;
  publishedAt?: string;
}
export interface MixImport {
  title: string;
  description: string;
  tags: string[];
  coverSourceUrl?: string;
  durationSec?: number;
  tracklist: { artist: string; title: string; timecodeSec: number }[];
  sourceType: 'mixcloud' | 'remote';
  sourceRef: string;
  sourceLabel: string;
  sourcePageUrl?: string;
}
export interface SourceImporter {
  readonly name: string;
  matches(url: URL): boolean;
  resolve(url: URL): Promise<MixImport | SourceItem[]>;
  importItem(ref: string): Promise<MixImport>;
}
```
- Produces: `POST /imports/resolve { url }` → `{ kind: 'mix', mix } | { kind: 'list', items }`; `POST /imports/item { ref }` → `MixImport`.

- [ ] **Step 1: Write the types**

Create `backend/src/imports/source-importer.ts` with exactly the three interfaces above, plus `import { BadRequestException } from '@nestjs/common';` and:

```ts
/** `ref` is opaque to the client and round-trips verbatim. Prefixing it with
 *  the importer name is what lets `ImportsService` route `importItem` without
 *  re-parsing a URL it no longer has. */
export function encodeRef(importer: string, value: string): string {
  return `${importer}:${value}`;
}
export function decodeRef(ref: string): { importer: string; value: string } {
  const separator = ref.indexOf(':');
  if (separator < 1) throw new BadRequestException('Référence de source invalide');
  return { importer: ref.slice(0, separator), value: ref.slice(separator + 1) };
}
```

- [ ] **Step 2: Write the failing dispatch test**

Create `backend/src/imports/imports.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { ImportsService } from './imports.service';
import type { SourceImporter } from './source-importer';

function stub(name: string, host: string): SourceImporter {
  return {
    name,
    matches: (url) => url.hostname === host,
    resolve: async () => [],
    importItem: async () => { throw new Error('unused'); },
  };
}

describe('ImportsService', () => {
  it('picks the first importer whose matches() accepts the URL', async () => {
    const first = stub('a', 'a.test');
    const second = stub('b', 'b.test');
    const service = new ImportsService([first, second]);
    expect(service.importerFor(new URL('https://b.test/x')).name).toBe('b');
  });

  it('refuses a URL no importer claims', () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    expect(() => service.importerFor(new URL('https://z.test/x'))).toThrow(BadRequestException);
  });

  it('refuses a non-https URL before consulting any importer', () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    expect(() => service.importerFor(new URL('http://a.test/x'))).toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd backend && npm test -- imports/imports.service.spec.ts`
Expected: FAIL — `Cannot find module './imports.service'`.

- [ ] **Step 4: Implement the service**

Create `backend/src/imports/imports.service.ts`:

```ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { decodeRef, type MixImport, type SourceImporter, type SourceItem } from './source-importer';

export const SOURCE_IMPORTERS = Symbol('SOURCE_IMPORTERS');

@Injectable()
export class ImportsService {
  constructor(@Inject(SOURCE_IMPORTERS) private readonly importers: SourceImporter[]) {}

  /**
   * Order matters: `podcast` claims any https URL, so it must come last. A URL
   * that reaches it and does not parse as a feed is reported as an unrecognised
   * link, not as a broken feed — the message that helps someone who pasted a
   * link to a site we do not support.
   */
  importerFor(url: URL): SourceImporter {
    if (url.protocol !== 'https:') {
      throw new BadRequestException('La source doit être en https');
    }
    const importer = this.importers.find((candidate) => candidate.matches(url));
    if (!importer) {
      throw new BadRequestException('Lien non reconnu. Sources gérées : Mixcloud, Archive.org, flux RSS.');
    }
    return importer;
  }

  async resolve(rawUrl: string): Promise<{ kind: 'mix'; mix: MixImport } | { kind: 'list'; items: SourceItem[] }> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Cette adresse n'est pas une URL valide");
    }
    const resolved = await this.importerFor(url).resolve(url);
    return Array.isArray(resolved) ? { kind: 'list', items: resolved } : { kind: 'mix', mix: resolved };
  }

  async importItem(ref: string): Promise<MixImport> {
    const { importer: name, value } = decodeRef(ref);
    const importer = this.importers.find((candidate) => candidate.name === name);
    if (!importer) throw new BadRequestException('Référence de source invalide');
    return importer.importItem(value);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npm test -- imports/imports.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Wrap the existing Mixcloud relay**

Create `backend/src/imports/mixcloud.importer.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { MixcloudService } from '../mixcloud/mixcloud.service';
import { encodeRef, type MixImport, type SourceImporter, type SourceItem } from './source-importer';

/**
 * The relay is unchanged; this only gives it the shape the registry expects.
 * A bare username (no URL) is handled by the controller, which synthesises
 * `https://www.mixcloud.com/<username>/` before dispatching.
 */
@Injectable()
export class MixcloudImporter implements SourceImporter {
  readonly name = 'mixcloud';

  constructor(private readonly mixcloud: MixcloudService) {}

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'mixcloud.com' || host.endsWith('.mixcloud.com');
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    // "/user/" is an account; "/user/slug/" is one cloudcast.
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) return this.importItem(`/${segments[0]}/${segments[1]}/`);

    const summaries = await this.mixcloud.listCloudcasts(segments[0] ?? '');
    return summaries.map((summary) => ({
      ref: encodeRef(this.name, summary.key),
      title: summary.name,
      durationSec: summary.audioLengthSec,
      coverUrl: summary.pictureUrl,
      publishedAt: summary.createdAt,
    }));
  }

  async importItem(key: string): Promise<MixImport> {
    const imported = await this.mixcloud.getCloudcast(key);
    return {
      title: imported.title,
      description: imported.description,
      tags: imported.tags,
      coverSourceUrl: imported.coverSourceUrl,
      tracklist: imported.tracklist,
      sourceType: 'mixcloud',
      sourceRef: key,
      sourceLabel: 'Mixcloud',
      sourcePageUrl: `https://www.mixcloud.com${key}`,
    };
  }
}
```

- [ ] **Step 7: Wire the module and the controller**

Create `backend/src/imports/imports.controller.ts`:

```ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportsService } from './imports.service';

class ResolveDto {
  @IsString() @MinLength(1) @MaxLength(2048) url!: string;
}
class ItemDto {
  @IsString() @MinLength(1) @MaxLength(2048) ref!: string;
}

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post('resolve')
  resolve(@Body() dto: ResolveDto) {
    // A bare word is the current Mixcloud usage — a username, not a URL — and
    // it keeps working without a mode switch or a second field.
    const raw = dto.url.trim();
    const url = /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? `https://www.mixcloud.com/${raw}/` : raw;
    return this.imports.resolve(url);
  }

  @Post('item')
  importItem(@Body() dto: ItemDto) {
    return this.imports.importItem(dto.ref);
  }
}
```

Create `backend/src/imports/imports.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MixcloudModule } from '../mixcloud/mixcloud.module';
import { ImportsController } from './imports.controller';
import { ImportsService, SOURCE_IMPORTERS } from './imports.service';
import { MixcloudImporter } from './mixcloud.importer';

@Module({
  imports: [MixcloudModule],
  controllers: [ImportsController],
  providers: [
    MixcloudImporter,
    ImportsService,
    {
      provide: SOURCE_IMPORTERS,
      // ORDER IS LOAD-BEARING. `PodcastImporter` claims every https URL, so it
      // must stay last — put anything after it and that importer never runs.
      inject: [MixcloudImporter],
      useFactory: (mixcloud: MixcloudImporter) => [mixcloud],
    },
  ],
})
export class ImportsModule {}
```

Tasks 7 and 8 extend the factory: add each importer to `providers`, to `inject`, and to the returned array in the documented order. Register `ImportsModule` in `app.module.ts`'s `imports`.

- [ ] **Step 8: Delete the old routes**

Delete `backend/src/mixcloud/mixcloud.controller.ts` and drop it from `mixcloud.module.ts`, exporting `MixcloudService` instead. The relay stays; only its HTTP surface goes.

- [ ] **Step 9: Run the suite and the app**

Run: `cd backend && npm test && npm run build`
Expected: PASS, and the build succeeds.

- [ ] **Step 10: Commit**

```bash
git add backend/src
git commit -m "feat(imports): interface SourceImporter et routes /imports"
```

---

## Task 7: Archive.org importer

**Files:**
- Create: `backend/src/imports/archive.importer.ts`, `backend/src/imports/archive.importer.spec.ts`, `backend/src/imports/__fixtures__/archive-item.json`
- Modify: `backend/src/imports/imports.module.ts`

**Interfaces:**
- Consumes: `safeFetch` (Task 4), `SourceImporter`/`MixImport`/`SourceItem`/`encodeRef` (Task 6).
- Produces: `parseArchiveItem(identifier: string, payload: unknown): SourceItem[]` — pure, exported for testing.
- Produces: `ArchiveImporter` (`name = 'archive'`).

- [ ] **Step 1: Capture the fixture from the real service**

Run:
```bash
curl -s 'https://archive.org/metadata/gd1977-05-08.sbd.hicks.4982.sbeok.shnf' \
  > backend/src/imports/__fixtures__/archive-item.json
```

Open it and read the `files` array. **The field names used below (`name`, `format`, `length`, `title`, and top-level `metadata.creator` / `metadata.description`) are written from memory — the fixture is the authority.** If a field differs, fix the parser to match the fixture, not the other way round.

- [ ] **Step 2: Write the failing parser test**

Create `backend/src/imports/archive.importer.spec.ts`:

```ts
import fixture from './__fixtures__/archive-item.json';
import { parseArchiveItem, extractIdentifier } from './archive.importer';

describe('extractIdentifier', () => {
  it('reads the identifier from a details URL', () => {
    expect(extractIdentifier(new URL('https://archive.org/details/my-item'))).toBe('my-item');
  });
  it('reads it from a details URL with a trailing path', () => {
    expect(extractIdentifier(new URL('https://archive.org/details/my-item/page/2'))).toBe('my-item');
  });
  it('returns null when there is no identifier', () => {
    expect(extractIdentifier(new URL('https://archive.org/'))).toBeNull();
  });
});

describe('parseArchiveItem', () => {
  it('keeps only audio files and builds download URLs', () => {
    const items = parseArchiveItem('my-item', fixture);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.ref).toMatch(/^archive:my-item\//);
      expect(item.title).toBeTruthy();
    }
  });

  it('drops non-audio files', () => {
    const items = parseArchiveItem('my-item', {
      files: [
        { name: 'a.mp3', format: 'VBR MP3', length: '125.4', title: 'Track A' },
        { name: 'cover.jpg', format: 'JPEG' },
        { name: 'notes.txt', format: 'Text' },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe('Track A');
    expect(items[0]!.durationSec).toBe(125);
  });

  it('falls back to the file name when a file has no title', () => {
    const items = parseArchiveItem('my-item', {
      files: [{ name: 'set-one.mp3', format: 'VBR MP3' }],
    });
    expect(items[0]!.title).toBe('set-one.mp3');
    expect(items[0]!.durationSec).toBeUndefined();
  });

  it('reads durations given as mm:ss', () => {
    const items = parseArchiveItem('my-item', {
      files: [{ name: 'a.mp3', format: 'VBR MP3', length: '4:05' }],
    });
    expect(items[0]!.durationSec).toBe(245);
  });

  it('returns an empty list when the item holds no audio', () => {
    expect(parseArchiveItem('my-item', { files: [{ name: 'a.txt', format: 'Text' }] })).toEqual([]);
  });
});
```

Set `"resolveJsonModule": true` in `backend/tsconfig.json` if it is not already on.

- [ ] **Step 3: Run it to verify it fails**

Run: `cd backend && npm test -- imports/archive.importer.spec.ts`
Expected: FAIL — `Cannot find module './archive.importer'`.

- [ ] **Step 4: Implement the importer**

Create `backend/src/imports/archive.importer.ts`:

```ts
import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import { encodeRef, type MixImport, type SourceImporter, type SourceItem } from './source-importer';

const METADATA_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/** Archive.org's `format` strings for audio. Matched case-insensitively on a
 *  prefix, because they carry qualifiers ("VBR MP3", "64Kbps MP3"). */
const AUDIO_FORMAT_HINTS = ['mp3', 'ogg', 'flac', 'wave', 'aiff', 'm4a', 'aac'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAudioFormat(format: unknown): boolean {
  if (typeof format !== 'string') return false;
  const lower = format.toLowerCase();
  return AUDIO_FORMAT_HINTS.some((hint) => lower.includes(hint));
}

/** Archive.org gives `length` either as seconds ("125.4") or as "mm:ss" / "h:mm:ss". */
export function parseLength(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const parts = raw.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
  return seconds > 0 ? Math.round(seconds) : undefined;
}

export function extractIdentifier(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'details' && segments[0] !== 'download') return null;
  return segments[1] ?? null;
}

export function parseArchiveItem(identifier: string, payload: unknown): SourceItem[] {
  const files = isRecord(payload) && Array.isArray(payload.files) ? payload.files : [];
  const items: SourceItem[] = [];

  for (const file of files) {
    if (!isRecord(file) || typeof file.name !== 'string' || !isAudioFormat(file.format)) continue;
    items.push({
      ref: encodeRef('archive', `${identifier}/${file.name}`),
      title: typeof file.title === 'string' && file.title.trim() ? file.title.trim() : file.name,
      durationSec: parseLength(file.length),
    });
  }

  return items;
}

@Injectable()
export class ArchiveImporter implements SourceImporter {
  readonly name = 'archive';

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (host === 'archive.org' || host.endsWith('.archive.org')) && extractIdentifier(url) !== null;
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    const identifier = extractIdentifier(url);
    if (!identifier) throw new NotFoundException("Cette adresse Archive.org ne désigne aucun item");

    const items = parseArchiveItem(identifier, await this.readMetadata(identifier));
    if (items.length === 0) {
      throw new NotFoundException('Cet item Archive.org ne contient aucun fichier audio');
    }
    // A single audio file is not a choice; skip the list and import it.
    return items.length === 1 ? this.importItem(items[0]!.ref.replace(/^archive:/, '')) : items;
  }

  async importItem(value: string): Promise<MixImport> {
    const slash = value.indexOf('/');
    const identifier = value.slice(0, slash);
    const fileName = value.slice(slash + 1);

    const payload = await this.readMetadata(identifier);
    const metadata = isRecord(payload) && isRecord(payload.metadata) ? payload.metadata : {};
    const item = parseArchiveItem(identifier, payload).find((candidate) =>
      candidate.ref === encodeRef('archive', value),
    );
    if (!item) throw new NotFoundException("Ce fichier n'existe plus dans cet item Archive.org");

    const creator = typeof metadata.creator === 'string' ? metadata.creator : undefined;

    return {
      title: item.title,
      description: typeof metadata.description === 'string' ? metadata.description : '',
      // Le nom du créateur rejoint les tags : le mix appartiendra au compte
      // Tambouille qui l'importe, donc sans ça plus rien ne dit de qui il est.
      tags: creator ? [creator] : [],
      durationSec: item.durationSec,
      tracklist: [],
      sourceType: 'remote',
      sourceRef: `https://archive.org/download/${identifier}/${encodeURIComponent(fileName)}`,
      sourceLabel: 'Archive.org',
      sourcePageUrl: `https://archive.org/details/${identifier}`,
    };
  }

  private async readMetadata(identifier: string): Promise<unknown> {
    const { body } = await safeFetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      maxBytes: METADATA_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      throw new BadGatewayException('Réponse illisible depuis Archive.org');
    }
  }
}
```

Archive.org answers a missing identifier with `200` and an empty object, not a 404, so "no audio file" is the message an unknown item produces. Confirm that against the fixture step and adjust the message if it answers otherwise.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npm test -- imports/archive.importer.spec.ts`
Expected: PASS.

- [ ] **Step 6: Register the importer**

Add `ArchiveImporter` to the `SOURCE_IMPORTERS` array in `imports.module.ts`, after `MixcloudImporter`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/imports backend/tsconfig.json
git commit -m "feat(imports): importeur Archive.org"
```

---

## Task 8: Podcast RSS importer

**Files:**
- Create: `backend/src/imports/podcast.importer.ts`, `backend/src/imports/podcast.importer.spec.ts`, `backend/src/imports/__fixtures__/podcast-feed.xml`
- Modify: `backend/src/imports/imports.module.ts`

**Interfaces:**
- Consumes: `safeFetch` (Task 4), the `source-importer` types (Task 6).
- Produces: `parseFeed(xml: string): { channelTitle: string; channelAuthor?: string; channelImage?: string; items: FeedEntry[] }` — pure, exported.
- Produces: `parseItunesDuration(raw: unknown): number | undefined`
- Produces: `PodcastImporter` (`name = 'podcast'`).

- [ ] **Step 1: Add the XML parser and capture the fixture**

Run:
```bash
cd backend && npm install fast-xml-parser
curl -sL 'https://ouiedire.net/feed/podcast' > src/imports/__fixtures__/podcast-feed.xml
head -60 src/imports/__fixtures__/podcast-feed.xml
```

If that URL does not serve a feed, use any real podcast feed and note which in a comment at the top of the spec file. **The element names below (`<enclosure url type>`, `<itunes:duration>`, `<itunes:author>`, `<itunes:image href>`, `<guid>`) are written from memory — the fixture is the authority.**

- [ ] **Step 2: Write the failing parser test**

Create `backend/src/imports/podcast.importer.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFeed, parseItunesDuration } from './podcast.importer';

const feed = readFileSync(join(__dirname, '__fixtures__/podcast-feed.xml'), 'utf8');

describe('parseItunesDuration', () => {
  it.each([
    ['3600', 3600],
    ['4:05', 245],
    ['1:02:03', 3723],
    ['', undefined],
    [undefined, undefined],
    ['not a duration', undefined],
  ])('reads %s as %s', (raw, expected) => {
    expect(parseItunesDuration(raw)).toBe(expected);
  });
});

describe('parseFeed', () => {
  it('reads the real fixture', () => {
    const parsed = parseFeed(feed);
    expect(parsed.channelTitle).toBeTruthy();
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.items[0]!.audioUrl).toMatch(/^https?:\/\//);
  });

  it('drops items with no enclosure', () => {
    const parsed = parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>No audio</title></item>
      <item><title>Has audio</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]!.title).toBe('Has audio');
  });

  it('drops enclosures that are not audio', () => {
    const parsed = parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>Video</title><enclosure url="https://x.test/a.mp4" type="video/mp4"/></item>
    </channel></rss>`);
    expect(parsed.items).toHaveLength(0);
  });

  it('falls back to the enclosure URL when an item has no guid', () => {
    const parsed = parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>A</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items[0]!.guid).toBe('https://x.test/a.mp3');
  });

  it('throws on something that is not a feed', () => {
    expect(() => parseFeed('<html><body>hello</body></html>')).toThrow();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd backend && npm test -- imports/podcast.importer.spec.ts`
Expected: FAIL — `Cannot find module './podcast.importer'`.

- [ ] **Step 4: Implement the importer**

Create `backend/src/imports/podcast.importer.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from '../common/safe-fetch';
import { encodeRef, type MixImport, type SourceImporter, type SourceItem } from './source-importer';

const FEED_MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

export interface FeedEntry {
  guid: string;
  title: string;
  description: string;
  audioUrl: string;
  durationSec?: number;
  publishedAt?: string;
  imageUrl?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // A feed whose titles contain "&amp;" or numbers must not come back as
  // numbers or booleans — every field here is text.
  parseTagValue: false,
  parseAttributeValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && '#text' in value) return String((value as any)['#text']).trim();
  return '';
}

/** `<itunes:duration>` is "3600", "mm:ss" or "hh:mm:ss" depending on the host. */
export function parseItunesDuration(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const parts = raw.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
  return seconds > 0 ? Math.round(seconds) : undefined;
}

export function parseFeed(xml: string): {
  channelTitle: string;
  channelAuthor?: string;
  channelImage?: string;
  items: FeedEntry[];
} {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) throw new BadRequestException("Cette adresse ne renvoie pas un flux RSS lisible");

  const channelImage =
    channel['itunes:image']?.['@_href'] ?? text(channel.image?.url) ?? undefined;

  const items: FeedEntry[] = [];
  for (const raw of asArray(channel.item)) {
    const enclosure = asArray(raw.enclosure)[0];
    const audioUrl = enclosure?.['@_url'];
    const type: string = enclosure?.['@_type'] ?? '';
    // Some feeds carry video or PDF enclosures alongside audio; a feed with no
    // audio at all is reported as such rather than imported empty.
    if (typeof audioUrl !== 'string' || !audioUrl || !type.toLowerCase().startsWith('audio/')) continue;

    items.push({
      guid: text(raw.guid) || audioUrl,
      title: text(raw.title) || 'Sans titre',
      description: text(raw.description) || text(raw['itunes:summary']),
      audioUrl,
      durationSec: parseItunesDuration(raw['itunes:duration']),
      publishedAt: text(raw.pubDate) || undefined,
      imageUrl: raw['itunes:image']?.['@_href'] ?? channelImage,
    });
  }

  return {
    channelTitle: text(channel.title),
    channelAuthor: text(channel['itunes:author']) || undefined,
    channelImage,
    items,
  };
}

/**
 * The fallback importer: a feed lives on any host, so it cannot be recognised
 * by host. It therefore claims every https URL and must be registered last.
 * A URL that reaches it and does not parse is reported as an unrecognised
 * link, which is the message that helps someone who pasted an unsupported site.
 */
@Injectable()
export class PodcastImporter implements SourceImporter {
  readonly name = 'podcast';

  matches(url: URL): boolean {
    return url.protocol === 'https:';
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    const feed = await this.readFeed(url.toString());
    if (feed.items.length === 0) {
      throw new NotFoundException('Ce flux ne contient aucun épisode audio');
    }
    // `ref` carries the feed URL and the entry's guid, because `importItem`
    // gets no URL back — only what the client hands it.
    return feed.items.map((entry) => ({
      ref: encodeRef('podcast', `${url.toString()} ${entry.guid}`),
      title: entry.title,
      durationSec: entry.durationSec,
      coverUrl: entry.imageUrl,
      publishedAt: entry.publishedAt,
    }));
  }

  async importItem(value: string): Promise<MixImport> {
    const [feedUrl, guid] = value.split(' ');
    if (!feedUrl || !guid) throw new BadRequestException('Référence de flux invalide');

    const feed = await this.readFeed(feedUrl);
    const entry = feed.items.find((candidate) => candidate.guid === guid);
    if (!entry) throw new NotFoundException("Cet épisode n'est plus dans le flux");

    const author = feed.channelAuthor ?? feed.channelTitle;

    return {
      title: entry.title,
      description: entry.description,
      tags: author ? [author] : [],
      coverSourceUrl: entry.imageUrl,
      durationSec: entry.durationSec,
      tracklist: [],
      sourceType: 'remote',
      sourceRef: entry.audioUrl,
      sourceLabel: feed.channelTitle || new URL(feedUrl).hostname,
      sourcePageUrl: feedUrl,
    };
  }

  private async readFeed(rawUrl: string): Promise<ReturnType<typeof parseFeed>> {
    const { body } = await safeFetch(rawUrl, {
      maxBytes: FEED_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/rss+xml, application/xml, text/xml',
    });
    try {
      return parseFeed(body.toString('utf8'));
    } catch {
      throw new BadRequestException('Lien non reconnu. Sources gérées : Mixcloud, Archive.org, flux RSS.');
    }
  }
}
```

**An enclosure URL may be http** even on an https feed. `sourceRef` is validated as https by `SourceRefConstraint` (Task 2), so such an episode is refused at create with a clear message rather than producing a mix a browser will not play. Confirm against the fixture whether real feeds hit this; if most do, raise it before widening anything.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && npm test -- imports/podcast.importer.spec.ts`
Expected: PASS.

- [ ] **Step 6: Register the importer last**

Add `PodcastImporter` to `SOURCE_IMPORTERS` in `imports.module.ts`, **after** `ArchiveImporter`. Add a comment saying the order is load-bearing.

- [ ] **Step 7: Run the whole suite**

Run: `cd backend && npm test && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src backend/package.json backend/package-lock.json
git commit -m "feat(imports): importeur de flux RSS"
```

---

## Task 9: The paste-a-URL flow

**Files:**
- Modify: `frontend/src/views/UploadView.vue`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: `POST /imports/resolve`, `POST /imports/item` (Task 6).
- Produces: `SourceItem` and `MixImport` types in `frontend/src/types/index.ts`, mirroring the backend's.

- [ ] **Step 1: Add the frontend types**

In `frontend/src/types/index.ts`, replace `MixcloudCloudcastSummary` / `MixcloudCloudcastImport` / `MixcloudTracklistEntry` with:

```ts
export interface SourceItem {
  ref: string
  title: string
  durationSec?: number
  coverUrl?: string
  publishedAt?: string
}

export interface MixImport {
  title: string
  description: string
  tags: string[]
  coverSourceUrl?: string
  durationSec?: number
  tracklist: { artist: string; title: string; timecodeSec: number }[]
  sourceType: 'mixcloud' | 'remote'
  sourceRef: string
  sourceLabel: string
  sourcePageUrl?: string
}

export type ResolveResponse =
  | { kind: 'mix'; mix: MixImport }
  | { kind: 'list'; items: SourceItem[] }
```

Keep `MixcloudArtist` only if `importedArtist` still reads it; otherwise delete it and use `sourceLabel`.

- [ ] **Step 2: Replace the resolve/import logic**

In `frontend/src/views/UploadView.vue`, replace `fetchMixcloudMixes` and `importMixcloudMix` with:

```ts
const sourceInput = ref('')
const sourceLoading = ref(false)
const sourceError = ref('')
const sourceItems = ref<SourceItem[]>([])
const importingRef = ref<string | null>(null)

/** Set once something has been imported: it is what makes the mix remote. */
const importedSource = ref<{ type: 'mixcloud' | 'remote'; ref: string; label: string; pageUrl?: string } | null>(null)

function applyImport(mix: MixImport) {
  title.value = mix.title
  description.value = mix.description
  tags.value = mix.tags.join(', ')
  coverSourceUrl.value = mix.coverSourceUrl ?? null
  trackRows.value = mix.tracklist.map((entry) => ({ ...entry }))
  importedSource.value = {
    type: mix.sourceType,
    ref: mix.sourceRef,
    label: mix.sourceLabel,
    pageUrl: mix.sourcePageUrl,
  }
  sourceItems.value = []
}

async function resolveSource() {
  const value = sourceInput.value.trim()
  if (!value || sourceLoading.value) return

  sourceLoading.value = true
  sourceError.value = ''
  sourceItems.value = []
  try {
    const { data } = await apiClient.post<ResolveResponse>('/imports/resolve', { url: value })
    if (data.kind === 'mix') applyImport(data.mix)
    else sourceItems.value = data.items
  } catch (err: any) {
    sourceError.value = err.response?.data?.message ?? "Impossible de lire cette source"
  } finally {
    sourceLoading.value = false
  }
}

async function importItem(item: SourceItem) {
  if (importingRef.value) return
  importingRef.value = item.ref
  sourceError.value = ''
  try {
    const { data } = await apiClient.post<MixImport>('/imports/item', { ref: item.ref })
    applyImport(data)
  } catch (err: any) {
    sourceError.value = err.response?.data?.message ?? "Impossible d'importer cet élément"
  } finally {
    importingRef.value = null
  }
}
```

Replace `keepAudioOnMixcloud` / `useMixcloudAudio` with `keepAudioAtSource` / `useRemoteAudio`, computed from `importedSource` instead of `importedMixcloudKey`.

- [ ] **Step 3: Update the submit payload**

```ts
  if (importedSource.value && keepAudioAtSource.value) {
    formData.append('sourceType', importedSource.value.type)
    formData.append('sourceRef', importedSource.value.ref)
  }
  // Sent whichever hosting was chosen: the duration belongs to the recording,
  // not to where its bytes sit.
  if (importedDurationSec.value) {
    formData.append('durationSec', String(importedDurationSec.value))
  }
```

`importedDurationSec` is a `ref<number | null>(null)` set in `applyImport` from `mix.durationSec ?? null`.

- [ ] **Step 4: Update the template**

- The import field binds `sourceInput`, calls `resolveSource`, placeholder `colle un lien Mixcloud, Archive.org, ou un flux RSS…`.
- The list below it iterates `sourceItems`, calls `importItem(item)`, shows `item.title` and, when present, the duration through `formatDuration(item.durationSec)`.
- The fieldset legend keeps two options; `laisser l'audio sur Mixcloud` becomes `laisser l'audio à sa source`, and the warning paragraph interpolates `importedSource.label`.

Concretely, the field and the list:

```vue
        <div class="flex items-stretch pt-5">
          <input
            v-model="sourceInput"
            type="text"
            placeholder="colle un lien Mixcloud, Archive.org, ou un flux RSS…"
            class="min-w-0 flex-1 border-2 border-r-0 border-tambouille-accent bg-white px-4 py-4 text-[17px] outline-none placeholder:text-tambouille-faint"
            @keyup.enter="resolveSource"
          />
          <button
            type="button"
            :disabled="sourceLoading || !sourceInput.trim()"
            class="tb-btn shrink-0 px-8"
            @click="resolveSource"
          >
            {{ sourceLoading ? 'Recherche…' : 'Go' }}
          </button>
        </div>

        <p v-if="sourceError" class="mt-2 text-sm text-tambouille-accent">{{ sourceError }}</p>

        <ul v-if="sourceItems.length" class="mt-5 max-h-96 overflow-y-auto border-t border-black/12">
          <li v-for="item in sourceItems" :key="item.ref">
            <button
              type="button"
              :disabled="importingRef !== null"
              class="flex w-full items-center gap-4 border-b border-black/12 px-2 py-3 text-left transition hover:bg-tambouille-surface-hover disabled:opacity-50"
              @click="importItem(item)"
            >
              <img v-if="item.coverUrl" :src="item.coverUrl" class="h-14 w-14 shrink-0 object-cover" alt="" />
              <div v-else class="h-14 w-14 shrink-0 bg-tambouille-surface-hover" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-display text-[15px] font-bold">{{ item.title }}</span>
                <span class="block truncate text-[13px] text-tambouille-muted">
                  {{ formatDuration(item.durationSec ?? null) ?? 'durée inconnue' }}
                </span>
              </span>
              <span v-if="importingRef === item.ref" class="shrink-0 text-xs text-tambouille-muted">
                Import…
              </span>
            </button>
          </li>
        </ul>
```

`formatDuration` is imported from `@/utils/time`.

- [ ] **Step 5: Type-check and build**

Run: `cd frontend && npm run type-check && npm run build`
Expected: both pass.

- [ ] **Step 6: Verify against the real backend**

Start the backend and the preview, sign in, open `/upload`, and paste in turn: a Mixcloud username (bare word), a Mixcloud cloudcast URL, an Archive.org `/details/` URL, and a podcast feed URL. Expected: the first, third and fourth show a list; the second fills the form directly. Screenshot the Archive.org list.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat(upload): un champ unique qui reconnaît la source collée"
```

---

## Task 10: Report a dead source, and name where a mix comes from

**Files:**
- Modify: `frontend/src/components/PlayerBar.vue:417-425`
- Modify: `frontend/src/views/MixDetailView.vue:194-198`

**Interfaces:**
- Consumes: `Mix.sourceType` / `Mix.sourceRef` (Task 3).

- [ ] **Step 1: Wire the `<audio>` error event**

In `frontend/src/components/PlayerBar.vue`, add `@error="onAudioError"` to the `<audio>` element and, in the script:

```ts
/** Set when the element itself fails, as opposed to the Mixcloud widget. */
const audioError = ref('')

/**
 * On R2 the object is either there or it is not, so this never fired. With a
 * remote source, a file that has moved or gone is the ordinary case — and
 * without this the bar sits at 0:00 saying nothing, which is exactly what the
 * Mixcloud path takes such care to avoid.
 */
function onAudioError() {
  audioError.value = playerStore.currentMix?.sourceType === 'remote'
    ? "La source de ce mix ne répond plus — elle a peut-être été retirée."
    : 'Ce fichier audio est illisible.'
  playerStore.pause()
}
```

Clear `audioError` in the existing `watch` on `playerStore.currentMix?.id`, beside `widgetError.value = ''`, and fold it into `playbackError`:

```ts
const playbackError = computed(() =>
  hasNoSource.value
    ? "Ce mix n'a pas de source audio et ne peut pas être lu."
    : widgetError.value || audioError.value,
)
```

Add `audioError.value` to `canPlay`'s condition so a failed mix does not look playable:

```ts
const canPlay = computed(() => !hasNoSource.value && !widgetError.value && !audioError.value)
```

- [ ] **Step 2: Verify the error path**

In the browser console on a page with a remote mix playing, run `document.querySelector('audio').src = 'https://archive.org/download/does-not-exist/x.mp3'`.
Expected: the bar shows "La source de ce mix ne répond plus" and the play button is disabled.

- [ ] **Step 3: Name the source on the mix page**

In `frontend/src/views/MixDetailView.vue`, replace the line currently reading `Audio hébergé sur Mixcloud`:

```vue
        <a
          v-if="sourcePageUrl"
          :href="sourcePageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
        >
          Audio hébergé sur {{ sourceLabel }}
        </a>
        <span v-else-if="mix.audioUrl">{{ mix.playsCount }} écoutes</span>
```

and in the script:

```ts
/**
 * `sourceType` says which player engine, not which site — Archive.org and a
 * podcast both answer 'remote'. The name shown therefore comes from the host
 * of `sourceRef`, which keeps the stored value from growing one per site.
 */
const sourceLabel = computed(() => {
  const current = mix.value
  if (!current?.sourceRef) return null
  if (current.sourceType === 'mixcloud') return 'Mixcloud'
  try {
    const host = new URL(current.sourceRef).hostname.replace(/^www\./, '')
    return host === 'archive.org' ? 'Archive.org' : host
  } catch {
    return null
  }
})

const sourcePageUrl = computed(() => {
  const current = mix.value
  if (!current?.sourceRef) return null
  return current.sourceType === 'mixcloud'
    ? `https://www.mixcloud.com${current.sourceRef}`
    : current.sourceRef
})
```

`mix` is the existing `ref<Mix | null>` already declared at the top of that file's script block.

- [ ] **Step 4: Type-check, build, and look at it**

Run: `cd frontend && npm run type-check && npm run build`
Expected: both pass.

Open a mix imported from Archive.org. Expected: "Audio hébergé sur Archive.org", linking to the item page.

- [ ] **Step 5: Run everything**

Run: `cd backend && npm test && cd ../frontend && npm run type-check && npm run build && npx eslint src`
Expected: backend suite green; frontend type-check and build green; eslint reports no more errors than it did before this work (22 pre-existing `no-explicit-any`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat(player): signale une source morte et nomme la provenance du mix"
```

---

## Notes for the reviewer

Two things in this plan deserve a closer look than the rest:

1. **Task 5 widens a guard on purpose.** `assertMixcloudCoverUrl`'s `.mixcloud.com` allow-list is deleted. The replacement is `safeFetch`'s address check, which is broader in what it permits and narrower in what it trusts. If Task 4's tests are not green, Task 5 must not land.

2. **Tasks 7 and 8 begin by capturing a fixture from the live service.** Every field name in those two parsers is written from memory. When the fixture disagrees with this plan, the fixture wins — fix the parser and say so in the commit message.

One deliberate divergence from the spec: it lists a `content-type` header check on the source document. `safeFetch` sends an `accept` header but does not enforce the response header, because parsing is the stronger test — `JSON.parse` and `parseFeed` both reject anything that is not what was asked for, and content-type headers are wrong often enough that enforcing them would refuse working feeds. The guarantee the spec wanted is met by Task 7 Step 4 and Task 8 Step 4; the mechanism differs.
