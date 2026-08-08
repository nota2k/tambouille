# R2 cleanup on mix deletion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deleting a mix deletes the audio and cover objects it owns on R2, instead of stranding them there for good.

**Architecture:** A pure key filter decides which stored paths are R2 keys and which are pre-migration disk paths. A thin `deleteFromR2` batches the survivors into one `DeleteObjectsCommand` and never throws. `MixesService.remove` calls it after the row is gone, so a storage failure cannot block a deletion the caller asked for.

**Tech Stack:** NestJS 11, `@aws-sdk/client-s3`, Prisma 7, Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-08-09-r2-cleanup-on-delete-design.md`

## Global Constraints

- Backend tests live beside their source as `*.spec.ts` (`jest.rootDir` is `src`). Run one with `npm test -- <path-relative-to-src>`.
- **No test may talk to R2, and no test may construct the real S3 client.**
- `backend/src/common/upload.utils.ts` calls `requireEnv` for four `R2_*` variables **at module load** and throws if any is missing. Any spec whose subject imports it, directly or transitively, must either `jest.mock` it or set those variables before the import. This is the single most likely way to break the suite in this plan.
- `sourceRef` is never deleted, never fetched, never touched. It is a URL on somebody else's host.
- A key that starts with `/uploads/` is a pre-migration disk path, never an R2 key.
- User-facing strings are French. Code comments follow the surrounding file (English in `common/`, mixed in `mixes/`).
- Log at `warn`, never `error`: a failed cleanup is not a failed request.

---

## File Structure

**Created:**
- `backend/src/common/r2-keys.ts` — the pure filter. No imports, no environment, no client. Exists as its own file precisely so it can be tested without any of that.
- `backend/src/common/r2-keys.spec.ts`
- `backend/src/common/upload.utils.spec.ts` — covers `deleteFromR2` only.

**Modified:**
- `backend/src/common/upload.utils.ts` — add `DeleteObjectsCommand` to the existing import, add `deleteFromR2`.
- `backend/src/mixes/mixes.service.ts` — `remove()` calls it.
- `backend/src/mixes/mixes.service.spec.ts` — mock `upload.utils`, add `mix.delete` to the Prisma mock, add the deletion tests.

---

## Task 1: The pure key filter

**Files:**
- Create: `backend/src/common/r2-keys.ts`
- Test: `backend/src/common/r2-keys.spec.ts`

**Interfaces:**
- Produces: `r2KeysOnly(keys: readonly (string | null | undefined)[]): string[]`

- [ ] **Step 1: Write the failing test**

Create `backend/src/common/r2-keys.spec.ts`:

```ts
import { r2KeysOnly } from './r2-keys';

describe('r2KeysOnly', () => {
  it('keeps ordinary object keys', () => {
    expect(r2KeysOnly(['covers/a.jpg', 'audio/b.mp3'])).toEqual([
      'covers/a.jpg',
      'audio/b.mp3',
    ]);
  });

  it('drops null and undefined, which is how an absent cover arrives', () => {
    expect(r2KeysOnly(['covers/a.jpg', null, undefined])).toEqual(['covers/a.jpg']);
  });

  it('drops empty and whitespace-only entries', () => {
    expect(r2KeysOnly(['', '   ', 'covers/a.jpg'])).toEqual(['covers/a.jpg']);
  });

  it('drops pre-migration disk paths', () => {
    // R2 reports a key it never held as deleted, with no error, so a disk path
    // handed to it would be confirmed as removed forever. The only defence is
    // not asking.
    expect(r2KeysOnly(['/uploads/covers/a.jpg', 'covers/b.jpg'])).toEqual([
      'covers/b.jpg',
    ]);
  });

  it('drops any absolute path, not just the /uploads/ prefix', () => {
    expect(r2KeysOnly(['/covers/a.jpg'])).toEqual([]);
  });

  it('drops a full URL, which is a remote source and not ours to delete', () => {
    expect(
      r2KeysOnly(['https://archive.org/download/x/y.mp3', 'covers/a.jpg']),
    ).toEqual(['covers/a.jpg']);
  });

  it('removes duplicates so one object is not named twice in a batch', () => {
    expect(r2KeysOnly(['covers/a.jpg', 'covers/a.jpg'])).toEqual(['covers/a.jpg']);
  });

  it('returns an empty array for an empty input', () => {
    expect(r2KeysOnly([])).toEqual([]);
  });

  it('returns an empty array when every entry is filtered out', () => {
    expect(r2KeysOnly([null, '/uploads/x.jpg', ''])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npm test -- common/r2-keys.spec.ts`
Expected: FAIL — `Cannot find module './r2-keys'`.

- [ ] **Step 3: Implement the filter**

Create `backend/src/common/r2-keys.ts`:

```ts
/**
 * Narrows stored media paths to the ones this server actually owns on R2.
 *
 * `Mix.audioUrl` and `Mix.coverUrl` hold three different kinds of value: an R2
 * object key (`covers/uuid.jpg`), a disk path left by the pre-migration
 * uploader (`/uploads/covers/uuid.jpg`), and null. Only the first is ours to
 * delete.
 *
 * The rule matches `mediaUrl()` in `frontend/src/utils/media.ts`, which splits
 * the same column the same way when deciding where to read from. Reading and
 * deleting must not disagree about what a value means.
 *
 * This lives apart from `upload.utils` so it can be tested without the R2
 * environment that module demands at load time.
 */
export function r2KeysOnly(
  keys: readonly (string | null | undefined)[],
): string[] {
  const kept = new Set<string>();

  for (const key of keys) {
    if (typeof key !== 'string') continue;
    const trimmed = key.trim();
    if (!trimmed) continue;
    // An absolute path is a disk path; a URL is a remote source. Neither is an
    // R2 key, and an R2 key never starts with a slash.
    if (trimmed.startsWith('/')) continue;
    if (trimmed.includes('://')) continue;
    kept.add(trimmed);
  }

  return [...kept];
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd backend && npm test -- common/r2-keys.spec.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/r2-keys.ts backend/src/common/r2-keys.spec.ts
git commit -m "feat(common): distingue les clés R2 des chemins disque hérités"
```

---

## Task 2: `deleteFromR2`

**Files:**
- Modify: `backend/src/common/upload.utils.ts`
- Test: `backend/src/common/upload.utils.spec.ts`

**Interfaces:**
- Consumes: `r2KeysOnly` (Task 1).
- Produces: `deleteFromR2(keys: readonly (string | null | undefined)[]): Promise<void>` — never throws.

- [ ] **Step 1: Write the failing test**

Create `backend/src/common/upload.utils.spec.ts`.

The `R2_*` assignments must run before `upload.utils` is imported, so the
import is deferred into `beforeEach` via `require`. `@aws-sdk/client-s3` is
mocked so no client is ever constructed against a real endpoint.

```ts
/**
 * `upload.utils` reads four R2_* variables and builds an S3 client the moment
 * it is imported. Both are neutralised here: the variables are set to
 * throwaway values, and the SDK is mocked, so nothing reaches the network and
 * no credentials are needed.
 */
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';

const send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectsCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

// `require`, not `import`: jest hoists `import` above the assignments above,
// and `upload.utils` reads those variables in its module body. The project is
// on typescript-eslint v8, where the rule is `no-require-imports` (v7's
// `no-var-requires` no longer exists).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deleteFromR2 } = require('./upload.utils') as typeof import('./upload.utils');

describe('deleteFromR2', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ Deleted: [], Errors: [] });
  });

  it('sends both keys in a single batched request', async () => {
    await deleteFromR2(['audio/a.mp3', 'covers/b.jpg']);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'test-bucket',
      Delete: { Objects: [{ Key: 'audio/a.mp3' }, { Key: 'covers/b.jpg' }] },
    });
  });

  it('sends nothing at all when no key survives filtering', async () => {
    await deleteFromR2([null, undefined, '/uploads/covers/old.jpg']);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing for a mix whose audio lives at its source', async () => {
    await deleteFromR2([null, null]);
    expect(send).not.toHaveBeenCalled();
  });

  it('resolves when R2 rejects the request', async () => {
    send.mockRejectedValue(new Error('network down'));
    await expect(deleteFromR2(['covers/b.jpg'])).resolves.toBeUndefined();
  });

  it('resolves when R2 reports per-key errors', async () => {
    send.mockResolvedValue({
      Deleted: [],
      Errors: [{ Key: 'covers/b.jpg', Code: 'AccessDenied' }],
    });
    await expect(deleteFromR2(['covers/b.jpg'])).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npm test -- common/upload.utils.spec.ts`
Expected: FAIL — `deleteFromR2 is not a function`.

- [ ] **Step 3: Implement it**

In `backend/src/common/upload.utils.ts`, extend the existing SDK import:

```ts
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
```

Add near the other imports:

```ts
import { Logger } from '@nestjs/common';
import { r2KeysOnly } from './r2-keys';
```

Add after `putBufferToR2`:

```ts
const storageLogger = new Logger('R2Storage');

/**
 * Deletes objects this server wrote. Best-effort by design: it never throws.
 *
 * Callers reach here having already done the thing the user asked for — the
 * row is gone. Raising now would turn a successful deletion into a failed
 * request over an object nobody can see, and the worst case of staying quiet
 * is an unreferenced object, which is exactly what this function exists to
 * reduce.
 *
 * Filtering happens inside rather than at the call site so every caller
 * inherits it, and an empty result issues no request at all.
 */
export async function deleteFromR2(
  keys: readonly (string | null | undefined)[],
): Promise<void> {
  const owned = r2KeysOnly(keys);
  if (owned.length === 0) return;

  try {
    const result = await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: owned.map((Key) => ({ Key })) },
      }),
    );

    // The batch API reports failures per key instead of rejecting, so a
    // partial failure is only visible here.
    for (const error of result.Errors ?? []) {
      storageLogger.warn(
        `Objet R2 non supprimé: ${error.Key} (${error.Code ?? 'raison inconnue'})`,
      );
    }
  } catch (err) {
    storageLogger.warn(
      `Suppression R2 échouée pour ${owned.join(', ')}: ${String(err)}`,
    );
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd backend && npm test -- common/upload.utils.spec.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the whole suite**

Run: `cd backend && npm test`
Expected: PASS. Nothing else imports `deleteFromR2` yet, so no other spec changes behaviour.

- [ ] **Step 6: Commit**

```bash
git add backend/src/common/upload.utils.ts backend/src/common/upload.utils.spec.ts
git commit -m "feat(common): deleteFromR2, best-effort et par lot"
```

---

## Task 3: `MixesService.remove` cleans up after itself

**Files:**
- Modify: `backend/src/mixes/mixes.service.ts`
- Modify: `backend/src/mixes/mixes.service.spec.ts`

**Interfaces:**
- Consumes: `deleteFromR2` (Task 2).

- [ ] **Step 1: Add the mock header and the Prisma method the tests need**

`mixes.service.spec.ts` currently imports `MixesService` without mocking
`upload.utils`, which was fine while the service did not import it. Task 3
makes the service import it, and that module throws at load time without R2
credentials. **Add this above every existing import** in
`backend/src/mixes/mixes.service.spec.ts`:

```ts
/**
 * `upload.utils` builds its R2 client at module load and demands the R2_*
 * variables. The service now imports it for cleanup; no unit test should need
 * credentials, and none of these tests delete anything for real.
 */
jest.mock('../common/upload.utils', () => ({
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
}));
```

Then add the import used by the new tests, beside the existing ones:

```ts
import { deleteFromR2 } from '../common/upload.utils';
```

In `createPrismaMock`, add `delete` to the `mix` object, which currently lacks
it:

```ts
    mix: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
```

- [ ] **Step 2: Write the failing tests**

Add to `backend/src/mixes/mixes.service.spec.ts`:

```ts
describe('remove', () => {
  const asMock = deleteFromR2 as jest.MockedFunction<typeof deleteFromR2>;

  beforeEach(() => {
    asMock.mockClear();
  });

  function serviceOwning(mix: Record<string, unknown>) {
    const prisma = createPrismaMock();
    prisma.mix.findUnique.mockResolvedValue(mix);
    prisma.mix.delete.mockResolvedValue(mix);
    return {
      prisma,
      service: new MixesService(prisma as unknown as PrismaService),
    };
  }

  it('deletes the audio and the cover together', async () => {
    const { prisma, service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: AUDIO_KEY,
      coverUrl: 'covers/abcd.jpg',
    });

    await service.remove(MIX_ID, USER_ID);

    expect(prisma.mix.delete).toHaveBeenCalledWith({ where: { id: MIX_ID } });
    expect(asMock).toHaveBeenCalledWith([AUDIO_KEY, 'covers/abcd.jpg']);
  });

  it('passes both slots even when the mix has no cover', async () => {
    const { service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: AUDIO_KEY,
      coverUrl: null,
    });

    await service.remove(MIX_ID, USER_ID);

    // Filtering is the helper's job, not the caller's — the service must not
    // grow its own copy of the rule.
    expect(asMock).toHaveBeenCalledWith([AUDIO_KEY, null]);
  });

  it('never passes sourceRef, which belongs to somebody else', async () => {
    const { service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: null,
      coverUrl: null,
      sourceType: SOURCE_TYPE,
      sourceRef: SOURCE_REF,
    });

    await service.remove(MIX_ID, USER_ID);

    expect(asMock).toHaveBeenCalledWith([null, null]);
    expect(JSON.stringify(asMock.mock.calls)).not.toContain(SOURCE_REF);
  });

  it('still succeeds when the cleanup fails', async () => {
    asMock.mockRejectedValueOnce(new Error('R2 down'));
    const { prisma, service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: AUDIO_KEY,
      coverUrl: null,
    });

    await expect(service.remove(MIX_ID, USER_ID)).resolves.toBeUndefined();
    expect(prisma.mix.delete).toHaveBeenCalled();
  });

  it('deletes nothing when the mix belongs to someone else', async () => {
    const { prisma, service } = serviceOwning({
      id: MIX_ID,
      userId: 'someone-else',
      audioUrl: AUDIO_KEY,
      coverUrl: 'covers/abcd.jpg',
    });

    await expect(service.remove(MIX_ID, USER_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.mix.delete).not.toHaveBeenCalled();
    expect(asMock).not.toHaveBeenCalled();
  });

  it('deletes nothing when the mix does not exist', async () => {
    const prisma = createPrismaMock();
    prisma.mix.findUnique.mockResolvedValue(null);
    const service = new MixesService(prisma as unknown as PrismaService);

    await expect(service.remove(MIX_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(asMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `cd backend && npm test -- mixes/mixes.service.spec.ts`
Expected: FAIL — `deleteFromR2` is never called, so the first four tests fail on
the assertion. The last two may already pass; that is fine, they guard the
ordering that Step 4 must not break.

- [ ] **Step 4: Wire it into the service**

In `backend/src/mixes/mixes.service.ts`, add the import beside the existing ones:

```ts
import { deleteFromR2 } from '../common/upload.utils';
```

Replace the body of `remove`:

```ts
  async remove(id: string, userId: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    if (mix.userId !== userId) {
      throw new ForbiddenException('You can only delete your own mixes');
    }

    await this.prisma.mix.delete({ where: { id } });

    // The row goes first on purpose. Deleting from R2 first and then failing on
    // the row would leave a mix that still exists with dead audio and a dead
    // cover — visible breakage, worse than an orphan nobody sees. This way the
    // worst case is what already happens today.
    //
    // `sourceRef` is absent from this list and must stay absent: it is a URL on
    // somebody else's host, never something this server stored.
    await deleteFromR2([mix.audioUrl, mix.coverUrl]);
  }
```

- [ ] **Step 5: Run them to verify they pass**

Run: `cd backend && npm test -- mixes/mixes.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Run the whole suite and build**

Run: `cd backend && npm test && npm run build`
Expected: PASS, and the build succeeds. `mixes.controller.spec.ts` already
mocks `upload.utils`; add `deleteFromR2: jest.fn()` to that mock's returned
object if the controller spec starts failing on a missing export.

- [ ] **Step 7: Commit**

```bash
git add backend/src/mixes/mixes.service.ts backend/src/mixes/mixes.service.spec.ts
git commit -m "feat(mixes): supprimer un mix supprime ses objets R2"
```

---

## Task 4: Verify against the real bucket

Unit tests prove the wiring. They cannot prove the object is gone, because
nothing in them talks to R2. This task does, once, by hand.

**Files:** none — this is a manual verification.

- [ ] **Step 1: Start the backend and create a mix with a cover**

```bash
cd backend && npm run build && node --enable-source-maps dist/src/main
```

In a second shell, register a throwaway account and create a mix whose cover is
imported from a real source, so a genuine object lands in the bucket:

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"r2check@example.test","username":"r2check","password":"R2CheckPass2026","displayName":"R2"}'
```

Take `accessToken` from the response, then:

```bash
curl -s -X POST http://localhost:3000/api/mixes \
  -H "Authorization: Bearer $TOKEN" \
  -F 'title=TEST suppression R2' \
  -F 'sourceType=remote' \
  -F 'sourceRef=https://archive.org/download/shakedownstreet2024-08-30.akg481.flac/shakedownstreet2024-08-30.akg481.t01.mp3' \
  -F 'coverSourceUrl=https://archive.org/download/shakedownstreet2024-08-30.akg481.flac/shakedownstreet2024-08-30.akg481.pic01.JPG'
```

Note the `id` and the `coverUrl` from the response.

- [ ] **Step 2: Confirm the object is really in the bucket**

Fetch the public URL built from `VITE_R2_PUBLIC_URL` and the returned key:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "https://pub-1e54e8d69f104891a750491d30902070.r2.dev/<coverUrl>"
```

Expected: `200`.

- [ ] **Step 3: Delete the mix**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE \
  "http://localhost:3000/api/mixes/<id>" -H "Authorization: Bearer $TOKEN"
```

Expected: `204`.

- [ ] **Step 4: Confirm the object is gone**

Run the same public-URL fetch as Step 2.
Expected: `404`. R2's public endpoint may cache briefly; retry once after a few
seconds before concluding it failed.

- [ ] **Step 5: Delete the throwaway account**

```bash
docker exec tambouille-postgres psql -U tambouille -d tambouille \
  -c "delete from users where username='r2check';"
```

Confirm the mix count returns to what it was before Step 1.

- [ ] **Step 6: Check a legacy mix is left alone**

Confirm no warning naming an `/uploads/…` path appears in the backend log
during the run. A mix on a disk path must produce no R2 request at all.

---

## Self-review notes

Spec sections and where they land:

| Spec section | Task |
|---|---|
| Row first, R2 second, failure not raised | 3 (ordering, comment), 2 (never throws) |
| `sourceRef` never touched | 3 (explicit test) |
| Legacy `/uploads/` skipped, explicitly | 1 (filter + tests), 2 (no request when empty) |
| One batched call | 2 |
| `deleteFromR2` interface and home | 2 |
| Error-handling table | 2 and 3 tests, row by row |
| Testing section | 1, 2, 3 |
| Out of scope: PATCH, account deletion, sweeping, retries | Not implemented anywhere — deliberate |
