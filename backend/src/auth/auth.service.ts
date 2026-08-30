import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenVerifier } from './google-token-verifier';
import { OidcTokenVerifier } from './oidc-token-verifier';

// Exported so `PasswordResetService` hashes at the same cost as registration
// and `setPassword`. A reset that landed a cheaper hash would quietly weaken
// every account that used it.
export const SALT_ROUNDS = 12;

// Deliberately identical wherever Google hands us an address it has not
// verified, whether or not an account exists on that address. A distinct
// message per branch would let an unauthenticated caller probe which email
// addresses are registered, simply by minting unverified tokens.
const UNVERIFIED_GOOGLE_EMAIL =
  'Google has not verified this email address. Sign in with your password instead.';

// Refusal for a *verified* Google identity whose address already belongs to an
// account. Unlike the message above this one names the situation, which is safe
// precisely because it is only reachable with a token Google has verified for
// that address: the caller has already proven to Google that the mailbox is
// theirs, so they learn nothing here they could not learn by other means.
//
// It points at `linkGoogle` rather than dead-ending, because this is exactly
// the user that flow was built for: sign in with the password, then attach
// Google from the profile, where the session proves ownership of the account —
// the half of the match this flow cannot prove. Kept to one sentence.
const EMAIL_ALREADY_REGISTERED =
  'An account already uses this email address — sign in with your password, then link Google from your profile.';

// Refusals for the authenticated linking flow (`linkGoogle`). Unlike the two
// messages above, these are only ever read by the owner of the session being
// used, so they can name the real reason without leaking to a stranger which
// addresses or Google accounts exist here.
const UNVERIFIED_GOOGLE_EMAIL_FOR_LINK =
  'Google has not verified this email address, so it cannot be attached to your account.';

const GOOGLE_ACCOUNT_ALREADY_USED =
  'This Google account is already linked to another Tambouille account.';

const ACCOUNT_ALREADY_LINKED =
  'This account is already linked to a Google account.';

// The membership-card equivalents of the four messages above, and they carry the
// same properties for the same reasons. This one in particular is used both when
// the address already has an account and when it does not, so that an
// unauthenticated caller cannot tell the two apart by the wording and use this
// flow to discover which addresses are registered here.
const UNVERIFIED_KEYCLOAK_EMAIL =
  'This email address is not verified on the club realm. Verify it there, then sign in again.';

// Only reachable with a token the realm has verified for that address, so
// naming the situation costs nothing the caller could not already establish.
// Points at the linking flow rather than dead-ending, for the same reason its
// Google counterpart does.
const EMAIL_ALREADY_REGISTERED_FOR_CARD =
  'An account already uses this email address — sign in as usual, then link your membership card from your profile.';

// Read only by the owner of the session being used, so these two can name the
// real reason without telling a stranger which cards or accounts exist.
const KEYCLOAK_ACCOUNT_ALREADY_USED =
  'This membership card is already linked to another Tambouille account.';

const ACCOUNT_ALREADY_LINKED_TO_CARD =
  'This account is already linked to a membership card.';

// Codes lisibles par machine, portés à côté du message par les deux refus de
// `loginWithKeycloak`. Le site doit distinguer les deux : l'un se reprend — se
// connecter, puis rattacher la carte — et l'autre non, puisque son destinataire
// n'a le plus souvent aucun compte ici. Apparier sur le texte du message ferait
// dépendre ce choix d'une tournure anglaise que la première reformulation
// casserait, sans que rien n'échoue visiblement.
const CARD_EMAIL_TAKEN = 'CARD_EMAIL_TAKEN';
const CARD_EMAIL_UNVERIFIED = 'CARD_EMAIL_UNVERIFIED';

// Prisma's unique-constraint violation. Not importing Prisma's own error
// class here to keep this check working against the plain mock objects the
// test suite throws, as well as the real `PrismaClientKnownRequestError`.
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleVerifier: GoogleTokenVerifier,
    private readonly oidcVerifier: OidcTokenVerifier,
  ) {}

  private toPublicUser(user: {
    id: string;
    email: string;
    username: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    password: string | null;
    googleId: string | null;
    keycloakId: string | null;
    incongruesUsername: string | null;
    incongruesToken: string | null;
    incongruesVerifiedAt: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      hasPassword: user.password !== null,
      // Le pseudo Musiques Incongrues du titulaire lui-même. Distinct de
      // `UsersService.getPublicProfile`, qui l'omet délibérément puisque ce
      // chemin-là est aussi ce que voient les autres visiteurs du profil : ce
      // paquet-ci ne part jamais que vers le titulaire de la session.
      incongruesUsername: user.incongruesUsername,
      // Le jeton en attente, pour que le profil puisse l'afficher à recopier
      // sur le forum sans un second aller-retour. Servi ici et non par
      // `UsersService.getPublicProfile` pour la même raison que le pseudo :
      // ce paquet-ci ne part jamais que vers le titulaire de la session.
      incongruesToken: user.incongruesToken,
      // Distinct de la simple présence d'un pseudo : c'est cette valeur, et
      // elle seule, qui dit si la synchronisation publie déjà les mix du
      // titulaire (voir `IncongruesSyncService.syncAll`).
      incongruesVerified: user.incongruesVerifiedAt !== null,
      // Whether a Google identity is attached — never the identity itself.
      // `googleId` is Google's `sub`, the key this account is found by in
      // `loginWithGoogle`; publishing it would hand anyone reading a profile
      // response the value they need to be looked up as this account.
      hasGoogle: user.googleId !== null,
      // Same rule, same reason: `keycloakId` is the realm's `sub`, and the only
      // key `loginWithKeycloak` finds this account by. Publishing it would hand
      // anyone reading a profile response the value they need to be looked up
      // as this account.
      hasKeycloak: user.keycloakId !== null,
    };
  }

  private async issueToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }

  private async session(user: Parameters<AuthService['toPublicUser']>[0]) {
    const accessToken = await this.issueToken(user.id);
    return { accessToken, user: this.toPublicUser(user) };
  }

  async register(dto: RegisterDto) {
    // Case-insensitive for the same reason `loginWithGoogle` is: emails are
    // stored verbatim, so `Nelly@Example.com` and `nelly@example.com` are one
    // mailbox but two strings, and the `@unique` index only catches the second
    // kind of sameness. An exact match here let the case variant register, and
    // every lookup that resolves an identity by address — `loginWithGoogle`,
    // `PasswordResetService.requestReset` — then did a `findFirst` over two
    // rows for one mailbox and got one of them arbitrarily.
    //
    // ponytail: the pre-check still races (two case variants registering at
    // once both pass it, and no index catches that pair). Closing it means a
    // unique index on `lower(email)`, which cannot be added before the
    // existing duplicates in the database are merged or renamed.
    const emailTaken = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (emailTaken) {
      // Named separately from the username case below. The combined message
      // this replaced protected nothing: any registration endpoint answers
      // "is this address taken?" to anyone willing to retry with a fresh
      // username, so the vagueness cost legitimate users a usable error
      // without costing an enumerator anything.
      throw new ConflictException('Email already in use');
    }

    // Insensitive for the same reason as the address above, and with the same
    // race left open: `@unique` on `username` only catches an identical string,
    // so an exact check let `Nelly` register next to `nelly` — two profiles a
    // reader cannot tell apart, on a column that is also the profile URL.
    // Lookups by username stay exact (`login`, `getPublicProfile`): once no two
    // rows differ only in case, an exact lookup is unambiguous.
    const usernameTaken = await this.prisma.user.findFirst({
      where: { username: { equals: dto.username, mode: 'insensitive' } },
      select: { id: true },
    });
    if (usernameTaken) {
      throw new ConflictException('Username already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: passwordHash,
        displayName: dto.displayName,
      },
    });

    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.emailOrUsername }, { username: dto.emailOrUsername }],
      },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.session(user);
  }

  async loginWithGoogle(idToken: string) {
    const identity = await this.googleVerifier.verify(idToken);

    // The only sign-in path for an existing row: this account carries this
    // exact `sub`, so the caller has proven they hold the Google identity the
    // account is keyed by, and nothing is being attached to anything here.
    //
    // How the `sub` got onto the row is deliberately not knowable from here,
    // and must not be assumed. Two paths lead to it: this flow created the
    // account (no password, no username until it completes one), or the
    // account's owner attached it from their profile via `linkGoogle` — in
    // which case it is an ordinary password account that also signs in with
    // Google. So `googleId != null` implies nothing whatsoever about
    // `password`, `username`, or how the account was born. Do not gate
    // behaviour on that inference; check the field you actually care about.
    const linked = await this.prisma.user.findFirst({
      where: { googleId: identity.googleId },
    });
    if (linked) {
      return this.session(linked);
    }

    // Case-insensitive on purpose. Emails are stored verbatim, so an account
    // registered as `Nelly@Example.com` is the same mailbox as Google's
    // `nelly@example.com` but not the same string. Since a match now means
    // "refuse", matching more broadly is the safe direction: an exact match
    // would miss the case variant and fall through to the create branch below,
    // making a second account on a mailbox that already has one.
    const sameEmail = await this.prisma.user.findFirst({
      where: { email: { equals: identity.email, mode: 'insensitive' } },
    });
    if (sameEmail) {
      // There is deliberately no *automatic* linking branch here. When an
      // address already has an account, this flow always refuses — whatever
      // `emailVerified` says, and whatever the row's current `googleId` is
      // (null or some other `sub`; an equal one would have signed in above).
      //
      // Automatic linking is only safe when *both* sides of the match are
      // proven, and Tambouille can prove only one. Google's `email_verified`
      // establishes that the caller owns the address on Google's side. Nothing
      // establishes it on ours: registration never verifies an email address,
      // so anyone can sign up as victim@corp.com with a password without ever
      // receiving mail there. Linking on a match would therefore attach the
      // real owner's Google identity to whichever row claimed the address
      // first, and hand the real owner a session on the impostor's account —
      // an account the impostor still holds the password to, and can keep
      // reading everything the owner then does with it.
      //
      // The cost is no longer a dead end. `linkGoogle` supplies the missing
      // proof from the other direction: the user signs in with their password
      // and attaches Google from their profile, where a valid session for this
      // exact account establishes our side of the match — the thing an email
      // comparison never could. So this refusal is a redirection, not a
      // refusal to serve the case, and the message says so.
      //
      // Both paths below throw; `emailVerified` chooses the wording only, and
      // when it is false the wording is identical to the create branch's so
      // that the two cases stay indistinguishable (see below).
      if (!identity.emailVerified) {
        throw new ConflictException(UNVERIFIED_GOOGLE_EMAIL);
      }
      throw new ConflictException(EMAIL_ALREADY_REGISTERED);
    }

    // Never create an account on an address Google has not verified. Anyone
    // controlling a Workspace domain they have not verified can mint a token
    // for any address at that domain; without this guard that token creates a
    // real account on someone else's address, which the caller then completes
    // with a username and a password using the session this very call returns
    // — a working account on a mailbox they do not own.
    if (!identity.emailVerified) {
      throw new ConflictException(UNVERIFIED_GOOGLE_EMAIL);
    }

    const created = await this.prisma.user.create({
      data: {
        googleId: identity.googleId,
        email: identity.email,
        displayName: identity.displayName,
        username: null,
        password: null,
      },
    });
    return this.session(created);
  }

  /**
   * Attaches a Google identity to the account the caller is already signed in
   * as. This is the safe counterpart to `loginWithGoogle`'s refusal: there,
   * the only evidence on our side is an email address nobody ever verified,
   * so a match proves nothing. Here the caller arrives with a valid session
   * for this exact account, which is direct proof they hold it — stronger
   * than any address comparison, and the reason no password is re-entered.
   */
  async linkGoogle(userId: string, idToken: string) {
    const identity = await this.googleVerifier.verify(idToken);

    // Google's own verification of the address is still required. An
    // unverified address means Google is not vouching for it — typically a
    // Workspace domain whose owner has not proven control of it — and we do
    // not attach an identity its issuer will not stand behind.
    if (!identity.emailVerified) {
      throw new ConflictException(UNVERIFIED_GOOGLE_EMAIL_FOR_LINK);
    }

    // The critical check. `googleId` is the sole key `loginWithGoogle` looks
    // an account up by, so two rows carrying the same one would mean whichever
    // `findFirst` returned first captured every Google sign-in for both — the
    // second account's owner silently landing in the first account. Refuse
    // instead. This is a pre-check for a clean message only: it is
    // check-then-act, and the unique index on `googleId` (caught as P2002
    // below) is what actually holds under concurrency.
    const takenBySomeoneElse = await this.prisma.user.findFirst({
      where: { googleId: identity.googleId },
    });
    if (takenBySomeoneElse && takenBySomeoneElse.id !== userId) {
      throw new ConflictException(GOOGLE_ACCOUNT_ALREADY_USED);
    }

    // Deliberately NOT checked: whether `identity.email` matches this
    // account's email. Plenty of people sign in here with one address and
    // hold their Google account on another, and requiring a match would
    // refuse those legitimate links while adding no safety whatsoever — the
    // session already proves ownership of this account, and Google's
    // `email_verified` already proves ownership of the Google one. An email
    // comparison proves nothing further, because our side of it was never
    // verified in the first place. Do not "tighten" this into a match check.
    let result: { count: number };
    try {
      // Conditional on purpose, exactly as `setUsername` and `setPassword`
      // are: the write only lands if the account still has no Google identity,
      // so two concurrent links cannot both succeed and the second cannot
      // silently re-point an already-linked account at a different `sub`.
      result = await this.prisma.user.updateMany({
        where: { id: userId, googleId: null },
        data: { googleId: identity.googleId },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Another account claimed this `googleId` between the check above and
        // this write. The index caught what the pre-check could not.
        throw new ConflictException(GOOGLE_ACCOUNT_ALREADY_USED);
      }
      throw error;
    }

    if (result.count === 0) {
      // The row no longer matched `googleId: null`: this account already has a
      // Google identity — the caller's own, if they linked twice, or one
      // attached by a concurrent request. There is no unlinking, so there is
      // nothing to offer here but the refusal.
      throw new ConflictException(ACCOUNT_ALREADY_LINKED);
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toPublicUser(updated);
  }

  /**
   * Sign-in by the club's membership card. Structurally identical to
   * `loginWithGoogle`, and deliberately *not* factored together with it (see
   * design decision 6 of the change `add-keycloak-oidc-login`): the guards here
   * happen to match today, but Google's exist against a threat specific to
   * Google — anyone holding an unverified Workspace domain can mint tokens for
   * every address on it — and nothing says the two policies move together. Two
   * short functions read; one parameterised over two issuers has to be decoded.
   */
  async loginWithKeycloak(idToken: string) {
    const identity = await this.oidcVerifier.verify(idToken);

    // The only sign-in path for an existing row, and it turns on the subject
    // alone: the caller has proven they hold the identity this account is keyed
    // by. How the subject got onto the row — this flow created the account, or
    // its owner attached the card from their profile — is deliberately not
    // knowable here and must not be inferred. `keycloakId != null` says nothing
    // about `password`, `username`, or `googleId`.
    const linked = await this.prisma.user.findFirst({
      where: { keycloakId: identity.subject },
    });
    if (linked) {
      return this.session(linked);
    }

    // Case-insensitive, like its Google counterpart and for the same reason:
    // addresses are stored verbatim, so `Nelly@Example.com` is the same mailbox
    // as `nelly@example.com` but not the same string. Since a match means
    // "refuse", matching more broadly is the safe direction — an exact match
    // would miss the case variant and fall through to the create branch,
    // making a second account on a mailbox that already has one.
    const sameEmail = await this.prisma.user.findFirst({
      where: { email: { equals: identity.email, mode: 'insensitive' } },
    });
    if (sameEmail) {
      // No automatic linking branch, ever. Linking is only safe when both sides
      // of the match are proven, and only one is: the realm vouches for the
      // caller's side, while ours rests on an address `register` never verified.
      // Attaching on a match would hand the real owner a session on whichever
      // row claimed the address first — a row its owner still has the password
      // to. `linkKeycloak` supplies the missing proof from the other direction,
      // so this refusal redirects rather than dead-ends.
      //
      // Alternatives weighed and rejected — including the one case where both
      // sides could be proven — are in design decision 4 of the change
      // `add-keycloak-oidc-login`, with the provenance table that settles it.
      // Nothing in that analysis needs to be built; do not rebuild it here.
      //
      // Both branches throw. `emailVerified` chooses the wording only, and when
      // it is false the wording matches the create branch's below, so that the
      // two cases stay indistinguishable to a caller minting unverified tokens.
      if (!identity.emailVerified) {
        throw new ConflictException({
          message: UNVERIFIED_KEYCLOAK_EMAIL,
          code: CARD_EMAIL_UNVERIFIED,
        });
      }
      throw new ConflictException({
        message: EMAIL_ALREADY_REGISTERED_FOR_CARD,
        code: CARD_EMAIL_TAKEN,
      });
    }

    // Never create an account on an address the realm has not verified. The
    // realm allows open registration, so without this guard anyone could sign
    // up there as victim@corp.com and have that token create a real Tambouille
    // account on someone else's address — which they then complete with a
    // username and a password using the session this very call returns.
    //
    // This is the whole reason account creation is in scope at all. If the
    // realm's "Verify email" setting is ever turned off, every member's token
    // carries `email_verified: false`, this guard refuses every creation, and
    // that is the correct outcome rather than a regression to work around.
    if (!identity.emailVerified) {
      throw new ConflictException({
        message: UNVERIFIED_KEYCLOAK_EMAIL,
        code: CARD_EMAIL_UNVERIFIED,
      });
    }

    const created = await this.prisma.user.create({
      data: {
        keycloakId: identity.subject,
        email: identity.email,
        displayName: identity.displayName,
        // The realm supplies a `preferred_username`, deliberately unused: taking
        // it would need a collision branch against our unique constraint and
        // would make the two creation paths diverge, to save one onboarding
        // step. The account completes exactly as a Google-created one does.
        username: null,
        password: null,
      },
    });
    return this.session(created);
  }

  /**
   * Attaches a membership card to the account the caller is already signed in
   * as. The safe counterpart to `loginWithKeycloak`'s refusal: there the only
   * evidence on our side is an address nobody verified, so a match proves
   * nothing; here the caller arrives with a valid session for this exact
   * account, which is direct proof they hold it.
   */
  async linkKeycloak(userId: string, idToken: string) {
    const identity = await this.oidcVerifier.verify(idToken);

    // Deliberately NOT checked, unlike `linkGoogle`: whether the realm verified
    // the address. That check exists there to avoid attaching an identity whose
    // issuer will not vouch for the address it carries — but this operation
    // consumes no address at all. It binds a subject to an account, the session
    // proving the account and the token proving the subject; the address is read
    // from neither side. Requiring it would refuse legitimate links while adding
    // nothing. Do not "tighten" this into a verification check.
    //
    // Nor is the card's address compared to the account's: plenty of members
    // hold their club identity on one address and their account on another, and
    // that mismatch is precisely the case this flow has to serve.

    // The critical check. `keycloakId` is the sole key `loginWithKeycloak` looks
    // an account up by, so two rows carrying the same one would mean whichever
    // `findFirst` returned first captured every card sign-in for both — the
    // second account's owner silently landing in the first account. This is a
    // pre-check for a clean message only: it is check-then-act, and the unique
    // index on `keycloakId` (caught as P2002 below) is what holds under
    // concurrency.
    const takenBySomeoneElse = await this.prisma.user.findFirst({
      where: { keycloakId: identity.subject },
    });
    if (takenBySomeoneElse && takenBySomeoneElse.id !== userId) {
      throw new ConflictException(KEYCLOAK_ACCOUNT_ALREADY_USED);
    }

    let result: { count: number };
    try {
      // Conditional on purpose, exactly as `setUsername`, `setPassword` and
      // `linkGoogle` are: the write only lands if the account still has no card,
      // so two concurrent links cannot both succeed and the second cannot
      // silently re-point an already-linked account at a different subject.
      result = await this.prisma.user.updateMany({
        where: { id: userId, keycloakId: null },
        data: { keycloakId: identity.subject },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Another account claimed this subject between the check above and this
        // write. The index caught what the pre-check could not.
        throw new ConflictException(KEYCLOAK_ACCOUNT_ALREADY_USED);
      }
      throw error;
    }

    if (result.count === 0) {
      // The row no longer matched `keycloakId: null`: this account already has a
      // card — the caller's own, if they linked twice, or one attached by a
      // concurrent request. There is no unlinking, so there is nothing to offer
      // here but the refusal.
      throw new ConflictException(ACCOUNT_ALREADY_LINKED_TO_CARD);
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toPublicUser(updated);
  }

  async setUsername(userId: string, username: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    // One-shot: this endpoint exists to complete a pending account, not to
    // rename an established one, which would break every link to its profile.
    //
    // The two checks below are pre-checks only: they give the common case a
    // clean, specific error message. They are check-then-act and cannot be
    // trusted for correctness under concurrency — two requests can both read
    // past them before either write lands. What actually guarantees "claimed
    // at most once" and "no two users share a username" is the conditional
    // `updateMany` (which only touches the row if it is still unclaimed) and
    // the database's unique constraint on `username` (caught below as
    // Prisma error P2002) — with one gap the index cannot close: it compares
    // strings, so two case variants racing each other both get through. Only a
    // unique index on `lower(username)` closes that, and it cannot be created
    // before the existing case-duplicates are dealt with.
    if (user.username) {
      throw new ConflictException('Username already set');
    }

    // Insensitive like `register`'s check, so this flow cannot claim the case
    // variant of a name that flow refuses. The P2002 fallback below still only
    // catches an identical string — see the note there.
    const taken = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (taken) {
      throw new ConflictException('Username already in use');
    }

    let result: { count: number };
    try {
      result = await this.prisma.user.updateMany({
        where: { id: userId, username: null },
        data: { username },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Username already in use');
      }
      throw error;
    }

    if (result.count === 0) {
      throw new ConflictException('Username already set');
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toPublicUser(updated);
  }

  async setPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    // Pre-check only, for a clean error message in the common case: it is
    // check-then-act and cannot be trusted for correctness under concurrency,
    // since two requests could both read `password === null` before either
    // write lands. What actually guarantees "set at most once" is the
    // conditional `updateMany` below, which only touches the row if it is
    // still passwordless. There is no unique constraint on `password`, so
    // unlike `setUsername` there is no P2002 case to catch.
    if (user.password) {
      throw new ConflictException('Password already set');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await this.prisma.user.updateMany({
      where: { id: userId, password: null },
      data: { password: passwordHash },
    });

    if (result.count === 0) {
      // The row no longer matched `password: null` — another request already
      // set a password for this account between our read and this write.
      throw new ConflictException('Password already set');
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toPublicUser(updated);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toPublicUser(user);
  }
}
