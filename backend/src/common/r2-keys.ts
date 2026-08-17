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
