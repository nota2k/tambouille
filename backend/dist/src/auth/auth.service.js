"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.SALT_ROUNDS = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const google_token_verifier_1 = require("./google-token-verifier");
const oidc_token_verifier_1 = require("./oidc-token-verifier");
exports.SALT_ROUNDS = 12;
const UNVERIFIED_GOOGLE_EMAIL = 'Google has not verified this email address. Sign in with your password instead.';
const EMAIL_ALREADY_REGISTERED = 'An account already uses this email address — sign in with your password, then link Google from your profile.';
const UNVERIFIED_GOOGLE_EMAIL_FOR_LINK = 'Google has not verified this email address, so it cannot be attached to your account.';
const GOOGLE_ACCOUNT_ALREADY_USED = 'This Google account is already linked to another Tambouille account.';
const ACCOUNT_ALREADY_LINKED = 'This account is already linked to a Google account.';
const UNVERIFIED_KEYCLOAK_EMAIL = 'This email address is not verified on the club realm. Verify it there, then sign in again.';
const EMAIL_ALREADY_REGISTERED_FOR_CARD = 'An account already uses this email address — sign in as usual, then link your membership card from your profile.';
const KEYCLOAK_ACCOUNT_ALREADY_USED = 'This membership card is already linked to another Tambouille account.';
const ACCOUNT_ALREADY_LINKED_TO_CARD = 'This account is already linked to a membership card.';
const CARD_EMAIL_TAKEN = 'CARD_EMAIL_TAKEN';
const CARD_EMAIL_UNVERIFIED = 'CARD_EMAIL_UNVERIFIED';
function isUniqueConstraintError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        error.code === 'P2002');
}
let AuthService = class AuthService {
    prisma;
    jwtService;
    googleVerifier;
    oidcVerifier;
    constructor(prisma, jwtService, googleVerifier, oidcVerifier) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.googleVerifier = googleVerifier;
        this.oidcVerifier = oidcVerifier;
    }
    toPublicUser(user) {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            hasPassword: user.password !== null,
            incongruesUsername: user.incongruesUsername,
            hasGoogle: user.googleId !== null,
            hasKeycloak: user.keycloakId !== null,
        };
    }
    async issueToken(userId) {
        return this.jwtService.signAsync({ sub: userId });
    }
    async session(user) {
        const accessToken = await this.issueToken(user.id);
        return { accessToken, user: this.toPublicUser(user) };
    }
    async register(dto) {
        const emailTaken = await this.prisma.user.findFirst({
            where: { email: { equals: dto.email, mode: 'insensitive' } },
            select: { id: true },
        });
        if (emailTaken) {
            throw new common_1.ConflictException('Email already in use');
        }
        const usernameTaken = await this.prisma.user.findFirst({
            where: { username: { equals: dto.username, mode: 'insensitive' } },
            select: { id: true },
        });
        if (usernameTaken) {
            throw new common_1.ConflictException('Username already in use');
        }
        const passwordHash = await bcrypt.hash(dto.password, exports.SALT_ROUNDS);
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
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: dto.emailOrUsername }, { username: dto.emailOrUsername }],
            },
        });
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return this.session(user);
    }
    async loginWithGoogle(idToken) {
        const identity = await this.googleVerifier.verify(idToken);
        const linked = await this.prisma.user.findFirst({
            where: { googleId: identity.googleId },
        });
        if (linked) {
            return this.session(linked);
        }
        const sameEmail = await this.prisma.user.findFirst({
            where: { email: { equals: identity.email, mode: 'insensitive' } },
        });
        if (sameEmail) {
            if (!identity.emailVerified) {
                throw new common_1.ConflictException(UNVERIFIED_GOOGLE_EMAIL);
            }
            throw new common_1.ConflictException(EMAIL_ALREADY_REGISTERED);
        }
        if (!identity.emailVerified) {
            throw new common_1.ConflictException(UNVERIFIED_GOOGLE_EMAIL);
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
    async linkGoogle(userId, idToken) {
        const identity = await this.googleVerifier.verify(idToken);
        if (!identity.emailVerified) {
            throw new common_1.ConflictException(UNVERIFIED_GOOGLE_EMAIL_FOR_LINK);
        }
        const takenBySomeoneElse = await this.prisma.user.findFirst({
            where: { googleId: identity.googleId },
        });
        if (takenBySomeoneElse && takenBySomeoneElse.id !== userId) {
            throw new common_1.ConflictException(GOOGLE_ACCOUNT_ALREADY_USED);
        }
        let result;
        try {
            result = await this.prisma.user.updateMany({
                where: { id: userId, googleId: null },
                data: { googleId: identity.googleId },
            });
        }
        catch (error) {
            if (isUniqueConstraintError(error)) {
                throw new common_1.ConflictException(GOOGLE_ACCOUNT_ALREADY_USED);
            }
            throw error;
        }
        if (result.count === 0) {
            throw new common_1.ConflictException(ACCOUNT_ALREADY_LINKED);
        }
        const updated = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        return this.toPublicUser(updated);
    }
    async loginWithKeycloak(idToken) {
        const identity = await this.oidcVerifier.verify(idToken);
        const linked = await this.prisma.user.findFirst({
            where: { keycloakId: identity.subject },
        });
        if (linked) {
            return this.session(linked);
        }
        const sameEmail = await this.prisma.user.findFirst({
            where: { email: { equals: identity.email, mode: 'insensitive' } },
        });
        if (sameEmail) {
            if (!identity.emailVerified) {
                throw new common_1.ConflictException({
                    message: UNVERIFIED_KEYCLOAK_EMAIL,
                    code: CARD_EMAIL_UNVERIFIED,
                });
            }
            throw new common_1.ConflictException({
                message: EMAIL_ALREADY_REGISTERED_FOR_CARD,
                code: CARD_EMAIL_TAKEN,
            });
        }
        if (!identity.emailVerified) {
            throw new common_1.ConflictException({
                message: UNVERIFIED_KEYCLOAK_EMAIL,
                code: CARD_EMAIL_UNVERIFIED,
            });
        }
        const created = await this.prisma.user.create({
            data: {
                keycloakId: identity.subject,
                email: identity.email,
                displayName: identity.displayName,
                username: null,
                password: null,
            },
        });
        return this.session(created);
    }
    async linkKeycloak(userId, idToken) {
        const identity = await this.oidcVerifier.verify(idToken);
        const takenBySomeoneElse = await this.prisma.user.findFirst({
            where: { keycloakId: identity.subject },
        });
        if (takenBySomeoneElse && takenBySomeoneElse.id !== userId) {
            throw new common_1.ConflictException(KEYCLOAK_ACCOUNT_ALREADY_USED);
        }
        let result;
        try {
            result = await this.prisma.user.updateMany({
                where: { id: userId, keycloakId: null },
                data: { keycloakId: identity.subject },
            });
        }
        catch (error) {
            if (isUniqueConstraintError(error)) {
                throw new common_1.ConflictException(KEYCLOAK_ACCOUNT_ALREADY_USED);
            }
            throw error;
        }
        if (result.count === 0) {
            throw new common_1.ConflictException(ACCOUNT_ALREADY_LINKED_TO_CARD);
        }
        const updated = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        return this.toPublicUser(updated);
    }
    async setUsername(userId, username) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        if (user.username) {
            throw new common_1.ConflictException('Username already set');
        }
        const taken = await this.prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
        });
        if (taken) {
            throw new common_1.ConflictException('Username already in use');
        }
        let result;
        try {
            result = await this.prisma.user.updateMany({
                where: { id: userId, username: null },
                data: { username },
            });
        }
        catch (error) {
            if (isUniqueConstraintError(error)) {
                throw new common_1.ConflictException('Username already in use');
            }
            throw error;
        }
        if (result.count === 0) {
            throw new common_1.ConflictException('Username already set');
        }
        const updated = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        return this.toPublicUser(updated);
    }
    async setPassword(userId, password) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        if (user.password) {
            throw new common_1.ConflictException('Password already set');
        }
        const passwordHash = await bcrypt.hash(password, exports.SALT_ROUNDS);
        const result = await this.prisma.user.updateMany({
            where: { id: userId, password: null },
            data: { password: passwordHash },
        });
        if (result.count === 0) {
            throw new common_1.ConflictException('Password already set');
        }
        const updated = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        return this.toPublicUser(updated);
    }
    async me(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        return this.toPublicUser(user);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        google_token_verifier_1.GoogleTokenVerifier,
        oidc_token_verifier_1.OidcTokenVerifier])
], AuthService);
//# sourceMappingURL=auth.service.js.map