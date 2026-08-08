# Password reset — design

**Date:** 2026-08-08
**Status:** Approved, ready for implementation

## Context

Tambouille has no way to recover an account. A user who forgets their password is locked out permanently: there is no reset, and support means the site owner editing the database by hand.

The platform sends no email at all today — no dependency, no service, no token model. A reset flow is therefore not a link on the login page; it is the first email the product ever sends, and the mechanism that finally proves someone controls an address.

Sending goes through **o2switch's SMTP**, using a mailbox on the existing domain. No third-party provider, no DNS records to add, nothing more to pay. The cost is deliverability: mail from a shared host lands in spam more often than mail from a dedicated sender. Accepted deliberately; it can be swapped later without touching the flow, since only the transport changes.

Scope is **reset only**. Email verification uses the same token mechanism and would also lift the standing limitation that a password-registered user cannot sign in with Google — but it is a separate decision, deliberately not taken here.

## Scope

In scope:
- Requesting a reset from the login page, by email address.
- A single-use, short-lived token delivered by email.
- Setting a new password with that token, without being signed in.

Out of scope:
- Email verification at registration, and therefore the Google-linking limitation, which stands.
- Changing a password while signed in — a separate feature, and one that must verify the current password.
- Any email other than this one: no welcome message, no notifications.

## The token

A reset token is a bearer credential: whoever holds it can take the account. It is treated as one.

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("password_reset_tokens")
}
```

- **32 random bytes** from `crypto.randomBytes`, base64url-encoded. Not a UUID: v4 UUIDs carry version and variant bits and are meant to be unique, not unguessable.
- **Stored hashed** (SHA-256), never in clear. The database is one more copy of every live token; a readable one is a password. SHA-256 rather than bcrypt is right here — the input is already 256 bits of entropy, so there is nothing to brute-force and the lookup must stay a single indexed read.
- **One hour** to live.
- **Single use.** `usedAt` is set on consumption, and every other live token for that user is invalidated at the same time — asking twice must not leave two working keys.

## API

### `POST /api/auth/password/forgot`

Body `{ email }`. **Always answers 204**, whether or not the address has an account, in the same time envelope. Anything else turns the form into an oracle for discovering who is registered — which matters more here than on most sites, because usernames are public and an address confirms which human is behind one.

Rate limited on the address and on the caller: without it the endpoint mails an arbitrary inbox as fast as it is called, and the person harassed is not even a user. A request for an address with a live unexpired token does not send a second one.

An account with no password — created through Google — is treated like any other. Proving control of the mailbox is the standard the whole flow rests on, and it is the same standard that would let that account set a password while signed in.

### `POST /api/auth/password/reset`

Body `{ token, password }`. Password rules identical to registration: 8–72 characters, hashed with bcrypt at 12 rounds.

Rejects with the same message whether the token is unknown, expired or already used. The distinction helps only someone probing tokens.

On success: the password is set, the token is marked used, the user's other live tokens are invalidated.

**Existing sessions are not revoked.** JWTs here are stateless with no denylist, so revoking them means infrastructure this design does not build. Stated plainly because it is a real gap: someone who stole a session keeps it after the victim resets. Worth fixing when sessions get a store.

## Email

Plain text and a minimal HTML part, in French, from the mailbox configured in the environment. It contains the link, its validity, and one line saying to ignore the message if the request was not theirs.

The link points at the frontend: `https://tambouille.pantagruweb.club/reinitialiser-mot-de-passe?token=…`.

Configuration lives in the environment — host, port, user, password, from-address — and is read **lazily, at send time**. Read at module load, a missing variable would take the whole API down; that failure mode has already cost this project a production outage. A missing configuration must break password reset alone, with a message naming the missing variable.

## Frontend

A "Mot de passe oublié ?" link on the login form, next to the password field.

Two screens: one asking for an address, which always shows the same confirmation; one taking the token from the query string and asking for a new password twice, then sending the user to sign in.

An absent or malformed token shows the error immediately rather than after a pointless round trip.

## Verification

The service is unit-tested with SMTP mocked: a token is stored hashed and never in clear; an unknown address still answers 204 and sends nothing; expired, used and unknown tokens are refused identically; consuming a token invalidates the user's others; and the password lands hashed.

Each of those guards is mutation-checked — deleted, and the resulting failure must be the assertion, not an unmocked call throwing.

The SMTP path itself is verified once against the real mailbox, by requesting a reset and completing it end to end.

## Known limitations

**Deliverability.** Mail from a shared host is more likely to be filtered. If reset messages go missing, the transport is the first suspect, not the code.

**Sessions survive a reset**, as described above.

**No email verification**, so an address is only proven at reset time, never at registration. The Google-linking limitation stands.
