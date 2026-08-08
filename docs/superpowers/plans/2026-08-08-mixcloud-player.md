# Mixcloud-hosted mixes — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mix live on Tambouille while its audio stays on Mixcloud, played through the site's own controls driving a hidden Mixcloud widget.

**Architecture:** `audioUrl` becomes nullable and `mixcloudKey` joins it; exactly one is set. `PlayerBar` — the only component that touches audio today — gains a second backend and picks it from the mix. The player store, already backend-agnostic, does not change. The Mixcloud import gains the choice that produces such a mix.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, Vue 3 + Pinia, Mixcloud Widget JS API.

**Design:** `docs/superpowers/specs/2026-08-08-mixcloud-player-design.md` — read it before starting; it carries the reasoning this plan only executes.

## Global Constraints

- **Exactly one of `audioUrl` and `mixcloudKey` is set on a mix.** Prisma cannot express it; `MixesService` enforces it on create and update, and both failure cases are tested and mutation-checked.
- Never silence a now-nullable `audioUrl` with `!` or a cast. Every site handles null deliberately — an unplayable mix is a real state, not a type inconvenience.
- `mixcloudKey` must satisfy the same pattern the import relay already enforces: `^/[A-Za-z0-9_-]+/(?:[A-Za-z0-9_.-]|%[89A-Fa-f][0-9A-Fa-f])+/$`. Reuse the existing constant; do not restate the regex.
- The play count is **hidden**, not zeroed, on a Mixcloud-hosted mix.
- Tests: plain Jest, hand-written mocks, direct service instantiation. No `@nestjs/testing`. Run with `npm test` from `backend/`.
- Do not stage `frontend/dist` — it is gitignored and deployed by rsync.
- Every commit ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

### Task 1: Let a mix be hosted on Mixcloud

**Files:** `backend/prisma/schema.prisma`, a generated migration, `backend/src/mixes/mixes.service.ts`, `backend/src/mixes/mixes.service.spec.ts` (create if absent), `backend/src/mixes/dto/create-mix.dto.ts`, `backend/src/mixes/dto/update-mix.dto.ts`

**Produces:** a `Mix` that carries either an R2 key or a Mixcloud key, and a service that refuses anything else. Every later task depends on this.

- [ ] Make `audioUrl` nullable and add `mixcloudKey String?`. Generate the migration; it must be additive and must not touch existing rows, all of which keep their `audioUrl`.
- [ ] Add `mixcloudKey` to the create and update DTOs, validated against the shared pattern.
- [ ] Enforce exactly-one-of in `MixesService.create` and `.update`: neither is a 400, both is a 400, and the messages say which. Write the tests first; they must fail before the rule exists.
- [ ] Fix every consumer the nullable `audioUrl` breaks. Compile, read each error, handle the null case. Report the list of files you touched and what each now does when there is no audio.
- [ ] The account-deletion path and the mix-deletion path must skip R2 removal for a mix with no `audioUrl`, rather than throwing.
- [ ] Mutation-check the exactly-one-of rule: delete it, confirm a test fails for the right reason, restore, report the message.
- [ ] `npm run build` exit 0, `npm test` green. Commit.

---

### Task 2: Play a Mixcloud mix

**Files:** `frontend/src/components/PlayerBar.vue`, `frontend/src/types/index.ts`, and a new module for the widget wrapper

**Consumes:** Task 1's `mixcloudKey`. **Produces:** playback for such a mix through the existing controls.

- [ ] Add `audioUrl: string | null` and `mixcloudKey: string | null` to the frontend `Mix` type, and fix what that breaks — again, no assertions.
- [ ] Load Mixcloud's widget script lazily, once, on first use. Never on page load.
- [ ] In `PlayerBar`, render the existing `<audio>` or a hidden widget iframe, chosen by `currentMix.mixcloudKey`. The iframe belongs to `PlayerBar` and must survive route changes.
- [ ] Wire the store to the widget both ways: `isPlaying` drives `play()`/`pause()`, `pendingSeekSec` drives `seek()`, the `progress` event feeds `setCurrentTime`, `getDuration()` feeds `setDuration`, and `ended` stops playback. The store itself must not change.
- [ ] `play()` may only be called on the tick of a real user gesture. State in your report how you guaranteed that, since browsers block it otherwise.
- [ ] Surface a clear error when the widget reports `error` or the mix is gone — a dead control that looks alive is worse than a visible failure.
- [ ] `npm run type-check` and `npm run build` exit 0. Verify in a browser against a real Mixcloud mix: play, pause, scrub, a tracklist timecode jump, and navigation between pages mid-playback without the sound stopping. Report each. Commit.

---

### Task 3: Hide the play count where it means nothing

**Files:** the components that render `playsCount`

**Consumes:** Task 1.

- [ ] Find every place `playsCount` is displayed and hide it when the mix has no `audioUrl`. Do not render a zero, and do not render an empty label where a number used to be — the layout must not shift.
- [ ] `npm run type-check` exit 0. Commit.

---

### Task 4: The button

**Files:** `frontend/src/views/UploadView.vue`

**Consumes:** Tasks 1 and 2. This is the visible feature and comes last, because before it the choice it offers cannot be stored or played.

- [ ] After a Mixcloud import, offer the choice: host the audio on Tambouille as today, or leave it on Mixcloud. Match the file's existing conventions.
- [ ] Choosing Mixcloud hides the audio file field and its requirement, and submits `mixcloudKey` instead. The cover is still imported into R2 either way.
- [ ] Choosing to host keeps today's behaviour exactly.
- [ ] The choice must be reversible before submitting, and switching back must restore the audio requirement — a user who changes their mind must not be able to submit a mix with neither source.
- [ ] Say plainly, in the interface, what choosing Mixcloud means: the audio stays there, and the mix stops working if it is removed.
- [ ] `npm run type-check` and `npm run build` exit 0. Verify the whole path in a browser: import a mix, choose Mixcloud, publish, and play it from the discover page. Commit.
