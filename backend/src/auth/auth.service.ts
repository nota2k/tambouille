import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenVerifier } from './google-token-verifier';

const SALT_ROUNDS = 12;

// Deliberately identical wherever Google hands us an address it has not
// verified, whether or not an account exists on that address. A distinct
// message per branch would let an unauthenticated caller probe which email
// addresses are registered, simply by minting unverified tokens.
const UNVERIFIED_GOOGLE_EMAIL =
  'Google has not verified this email address. Sign in with your password instead.';

// Refusal for a Google identity whose address already belongs to an account.
// There is no linking flow to offer instead, by design — see `loginWithGoogle`.
const EMAIL_ALREADY_REGISTERED =
  'An account already uses this email address. Sign in with your password instead.';

// Prisma's unique-constraint violation. Not importing Prisma's own error
// class here to keep this check working against the plain mock objects the
// test suite throws, as well as the real `PrismaClientKnownRequestError`.
function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly googleVerifier: GoogleTokenVerifier,
  ) {}

  private toPublicUser(user: { id: string; email: string; username: string | null; displayName: string; bio: string | null; avatarUrl: string | null; createdAt: Date; password: string | null }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      hasPassword: user.password !== null,
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
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
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
      // No password hash means this is a Google-only account; it can't
      // authenticate through the password flow.
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

    // The only sign-in path for an existing row. This account carries this
    // exact `sub`, which means this flow created it: the Google identity was
    // there from the start and nothing is being attached to anything.
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
      // There is deliberately no linking branch here. When an address already
      // has an account, this flow always refuses — whatever `emailVerified`
      // says, and whatever the row's current `googleId` is (null or some other
      // `sub`; an equal one would have signed in above).
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
      // The accepted cost: someone who registered with a password cannot sign
      // in with Google. If email verification is ever added at registration,
      // our side becomes provable too and linking can be reconsidered — this
      // refusal is a decision, not an oversight.
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

  async setUsername(userId: string, username: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
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
    // Prisma error P2002).
    if (user.username) {
      throw new ConflictException('Username already set');
    }

    const taken = await this.prisma.user.findFirst({ where: { username } });
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
      // The row no longer matched `username: null` — another request already
      // claimed a username for this account between our read and this write.
      throw new ConflictException('Username already set');
    }

    const updated = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublicUser(updated);
  }

  async setPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
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

    const updated = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublicUser(updated);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublicUser(user);
  }
}
