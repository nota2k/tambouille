import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenVerifier } from './google-token-verifier';
import { OidcTokenVerifier } from './oidc-token-verifier';
export declare const SALT_ROUNDS = 12;
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly googleVerifier;
    private readonly oidcVerifier;
    constructor(prisma: PrismaService, jwtService: JwtService, googleVerifier: GoogleTokenVerifier, oidcVerifier: OidcTokenVerifier);
    private toPublicUser;
    private issueToken;
    private session;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            incongruesUsername: string | null;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            incongruesUsername: string | null;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    loginWithGoogle(idToken: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            incongruesUsername: string | null;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    linkGoogle(userId: string, idToken: string): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        incongruesUsername: string | null;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    loginWithKeycloak(idToken: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            username: string | null;
            displayName: string;
            bio: string | null;
            avatarUrl: string | null;
            createdAt: Date;
            hasPassword: boolean;
            incongruesUsername: string | null;
            hasGoogle: boolean;
            hasKeycloak: boolean;
        };
    }>;
    linkKeycloak(userId: string, idToken: string): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        incongruesUsername: string | null;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    setUsername(userId: string, username: string): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        incongruesUsername: string | null;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    setPassword(userId: string, password: string): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        incongruesUsername: string | null;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
    me(userId: string): Promise<{
        id: string;
        email: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        hasPassword: boolean;
        incongruesUsername: string | null;
        hasGoogle: boolean;
        hasKeycloak: boolean;
    }>;
}
