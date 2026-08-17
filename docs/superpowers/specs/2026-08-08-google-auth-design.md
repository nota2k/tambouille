# Google sign-in — design

**Date:** 2026-08-08
**Status:** Approved, ready for implementation planning

## Context

Tambouille authenticates with email/username plus a bcrypt password, issuing a JWT (`AuthService.register` / `login`, `JwtStrategy`). The user wants Google as an additional way to sign up and sign in.

The deployed topology matters here: the frontend is served from `tambouille.pantagruweb.club` and the API from `api.tambouille.pantagruweb.club` — two distinct origins, already handled by an explicit CORS allowance. That separation is what makes the redirect-based OAuth flow awkward and drives the main decision below.

## Scope

In scope:
- Sign up and sign in with Google, returning the same JWT session the password flow already returns.
- Refusing a Google sign-in whose email already has an account, rather than linking the two.
- A username-selection step for accounts created through Google, since Google supplies no username.
- Letting a Google-created account add a password later, from its settings.

Out of scope:
- Any other identity provider.
- Changing or resetting an existing password (no such feature exists today; adding one is a separate concern).
- Account unlinking, or deleting the Google association.
- Migrating existing password accounts to Google.

## Decisions

| Decision | Rationale |
|---|---|
| **Google Identity Services ID-token flow**, not the redirect flow | The frontend receives a signed ID token from Google and POSTs it to the API, which verifies it. No cross-origin redirect dance between two subdomains, no JWT passed through a URL (where it would land in browser history and access logs), no callback URL to maintain. It also needs only a **public client ID** — no client secret to store or protect. |
| **No linking on matching email** — refuse instead | This reverses an earlier decision to link automatically, gated on `email_verified`. That gate only proves the *Google* side of the match. Tambouille verifies no email addresses at all: anyone can register `victim@corp.com` with a password without ever receiving mail there. So an attacker registers the victim's address by password, the victim later signs in with Google, and linking would attach the victim's Google identity to the attacker's row and return a session **on the attacker's account** — which the attacker still has the password to. Linking is only safe when both sides are proven; we can prove one. So an address that already has an account is always refused (409), whatever `email_verified` says and whatever the row's current `googleId` is. Accepted consequence: **a user who registered with a password cannot sign in with Google until email verification exists.** |
| Account creation still gated on `email_verified` | Anyone controlling an unverified Workspace domain can mint a token for any address at it. Without this check that token creates a real account on someone else's address, which the caller then completes with a username and password using the session the call returns. |
| Username chosen by the user, not derived | Deriving `nelly` from `nelly@gmail.com` leaks part of the email address into a public handle and produces ugly collisions (`nelly2`, `nelly3`). One extra screen is the cost of a handle the user actually picked. |
| Google accounts may add a password later | Keeps a second way in if the user loses access to their Google account. |

## Data model

Three changes to `User`, one migration, no impact on existing rows:

```prisma
password  String?          // nullable: a Google-created account has none
username  String?  @unique // nullable: unset until the user picks one
googleId  String?  @unique // Google's stable subject identifier
```

`username` being nullable is what represents the "signed in but not yet set up" state. PostgreSQL permits multiple NULLs under a unique constraint, so several pending accounts can coexist. Storing `googleId` rather than relying on the email means a user who later changes their Google email still resolves to the same account.

## API

### `POST /api/auth/google`

Body: `{ idToken: string }` — the credential returned by Google Identity Services.

The token is verified with `google-auth-library`, which checks the signature against Google's public keys, the issuer, the expiry, and that the audience matches our client ID. A token that fails any of these is rejected with 401; none of the logic below runs on an unverified token.

Resolution order:

1. A user with this `googleId` exists → sign in. This is the only path that signs in an existing row, and it only ever matches an account this flow created.
2. Otherwise, a user with this email exists (matched case-insensitively, so a case variant cannot slip through into a duplicate) → **409**, with a message telling the user to sign in with their password. Always, regardless of `email_verified` and regardless of whether that user's `googleId` is null or some other subject. No `googleId` is ever written onto an existing row.
3. Otherwise, `email_verified` is false → **409**. Same wording as the unverified case under step 2, so an unauthenticated caller minting unverified tokens cannot use the difference to discover which addresses are registered.
4. Otherwise → create a user with `googleId`, `email`, `displayName` from Google's `name`, `username: null`, `password: null`.

Returns `{ accessToken, user }`, the same shape as `login`. `user.username` may be `null`.

### `POST /api/auth/username` (authenticated)

Body: `{ username: string }`. Sets the username **only if it is currently null**; a second call returns 409. Applies the same format and uniqueness rules as registration, so the two paths cannot produce handles the other would reject.

### `POST /api/auth/password` (authenticated)

Body: `{ password: string }`. Sets a password on an account that has none. Returns 409 if one is already set — changing an existing password is out of scope and would require verifying the current one.

### Existing endpoints

`login` must reject an account whose `password` is null with the same generic `Invalid credentials` as a wrong password, rather than passing `null` to `bcrypt.compare`. Keeping the message identical avoids revealing which addresses are Google-only.

`toPublicUser` gains a possibly-null `username`.

## Frontend

A Google button on both the login and registration views, backed by Google Identity Services. On success the ID token goes to `POST /api/auth/google` and the returned session is stored exactly as the password flow stores it.

A route guard sends any authenticated user whose `username` is null to a username-selection screen, and prevents leaving it until one is set. A "set a password" section in the profile settings, shown only when the account has none.

## Configuration

`GOOGLE_CLIENT_ID` on the backend (to validate the token audience) and `VITE_GOOGLE_CLIENT_ID` on the frontend. The same public value; no secret.

The OAuth client must authorise `https://tambouille.pantagruweb.club` and `http://localhost:5173` as JavaScript origins.

## Verification

Consistent with the rest of this project, verification is by real request/response rather than an automated suite, which does not exist here. The cases that matter are the ones where being wrong is expensive: a tampered or expired ID token must be refused; a matching email must produce 409 and must leave the existing row untouched, verified or not; a second call to `/auth/username` must not overwrite a chosen handle; and password login against a Google-only account must fail like any bad credential.

## Known limitations

**A pending account has no public profile.** Until a username is chosen, profile routes cannot resolve the user. This is accepted: the selection screen is unskippable, so the state is short-lived.

**A password account cannot use Google sign-in.** This is the accepted consequence of refusing rather than linking: **a user who registered with a password cannot sign in with Google until email verification exists.** They keep their password, which still works; Google simply is not a second door into that account. Adding email verification at registration would make our side of the match provable and let linking be reconsidered — until then the refusal is the correct behaviour, not a gap.

**No unlinking.** A Google identity set at account creation stays attached. Adding a password gives the user a second way in, but not a way to detach the association.
