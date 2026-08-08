import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenVerifier } from './google-token-verifier';

const SALT_ROUNDS = 12;

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

  private toPublicUser(user: { id: string; email: string; username: string | null; displayName: string; bio: string | null; avatarUrl: string | null; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
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

    const linked = await this.prisma.user.findFirst({
      where: { googleId: identity.googleId },
    });
    if (linked) {
      return this.session(linked);
    }

    const sameEmail = await this.prisma.user.findFirst({
      where: { email: identity.email },
    });
    if (sameEmail) {
      // Linking on an unverified address would hand this account to anyone who
      // can create a Google account bearing the same address.
      if (!identity.emailVerified) {
        throw new ConflictException(
          'An account already uses this email address. Sign in with your password.',
        );
      }
      const updated = await this.prisma.user.update({
        where: { id: sameEmail.id },
        data: { googleId: identity.googleId },
      });
      return this.session(updated);
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
