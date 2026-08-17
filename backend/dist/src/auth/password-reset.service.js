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
var PasswordResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = exports.SlidingWindow = exports.RESPONSE_FLOOR_MS = void 0;
exports.callerIdentity = callerIdentity;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const auth_service_1 = require("./auth.service");
const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000;
exports.RESPONSE_FLOOR_MS = 500;
const MAX_TRACKED_KEYS = 10_000;
const INVALID_TOKEN = 'This password reset link is invalid or has expired.';
const RESET_PATH = '/reinitialiser-mot-de-passe';
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
const SWEEP_EVERY_CALLS = 500;
class SlidingWindow {
    limit;
    windowMs;
    maxKeys;
    hits = new Map();
    callsSinceSweep = 0;
    constructor(limit, windowMs, maxKeys) {
        this.limit = limit;
        this.windowMs = windowMs;
        this.maxKeys = maxKeys;
    }
    tryConsume(key) {
        const now = Date.now();
        this.callsSinceSweep += 1;
        if (this.callsSinceSweep >= SWEEP_EVERY_CALLS ||
            this.hits.size >= this.maxKeys) {
            this.sweep(now);
        }
        const cutoff = now - this.windowMs;
        const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);
        if (recent.length >= this.limit) {
            this.hits.set(key, recent);
            return false;
        }
        recent.push(now);
        this.hits.delete(key);
        this.hits.set(key, recent);
        return true;
    }
    get size() {
        return this.hits.size;
    }
    sweep(now) {
        this.callsSinceSweep = 0;
        const cutoff = now - this.windowMs;
        for (const [key, times] of this.hits) {
            if ((times[times.length - 1] ?? 0) <= cutoff) {
                this.hits.delete(key);
            }
        }
        while (this.hits.size >= this.maxKeys) {
            const stalest = this.hits.keys().next();
            if (stalest.done) {
                break;
            }
            this.hits.delete(stalest.value);
        }
    }
}
exports.SlidingWindow = SlidingWindow;
function callerIdentity(ip) {
    if (!ip) {
        return null;
    }
    const address = ip.trim().toLowerCase();
    const bare = address.startsWith('::ffff:')
        ? address.slice('::ffff:'.length)
        : address;
    if (bare === '' || bare === '::' || bare === '::1' || bare === '0.0.0.0') {
        return null;
    }
    if (/^127\./.test(bare)) {
        return null;
    }
    return bare;
}
let PasswordResetService = PasswordResetService_1 = class PasswordResetService {
    prisma;
    mailer;
    config;
    logger = new common_1.Logger(PasswordResetService_1.name);
    perAddress = new SlidingWindow(3, 60 * 60 * 1000, MAX_TRACKED_KEYS);
    perCaller = new SlidingWindow(10, 60 * 60 * 1000, MAX_TRACKED_KEYS);
    pending = new Set();
    warnedAboutCallerIdentity = false;
    constructor(prisma, mailer, config) {
        this.prisma = prisma;
        this.mailer = mailer;
        this.config = config;
    }
    async forgot(email, callerIp) {
        const startedAt = Date.now();
        try {
            await this.attemptForgot(email, callerIp);
        }
        finally {
            await this.holdUntilFloor(startedAt);
        }
    }
    async attemptForgot(email, callerIp) {
        if (!this.perAddress.tryConsume(email.toLowerCase())) {
            return;
        }
        const caller = callerIdentity(callerIp);
        if (caller === null) {
            this.warnOnceAboutCallerIdentity(callerIp);
        }
        else if (!this.perCaller.tryConsume(caller)) {
            return;
        }
        const user = await this.prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
        });
        if (!user) {
            return;
        }
        const token = (0, crypto_1.randomBytes)(TOKEN_BYTES).toString('base64url');
        await this.prisma.passwordResetToken.create({
            data: {
                tokenHash: hashToken(token),
                userId: user.id,
                expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
            },
        });
        this.deliver(user.email, token);
    }
    async reset(token, password) {
        const row = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashToken(token) },
        });
        const now = new Date();
        if (!row || row.usedAt !== null || row.expiresAt <= now) {
            throw new common_1.BadRequestException(INVALID_TOKEN);
        }
        const passwordHash = await bcrypt.hash(password, auth_service_1.SALT_ROUNDS);
        await this.prisma.$transaction(async (tx) => {
            const consumed = await tx.passwordResetToken.updateMany({
                where: { id: row.id, usedAt: null },
                data: { usedAt: now },
            });
            if (consumed.count === 0) {
                throw new common_1.BadRequestException(INVALID_TOKEN);
            }
            await tx.user.update({
                where: { id: row.userId },
                data: { password: passwordHash },
            });
            await tx.passwordResetToken.updateMany({
                where: { userId: row.userId, usedAt: null },
                data: { usedAt: now },
            });
        });
    }
    async flushDeliveries() {
        await Promise.all([...this.pending]);
    }
    async holdUntilFloor(startedAt) {
        const remaining = exports.RESPONSE_FLOOR_MS - (Date.now() - startedAt);
        if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
        }
    }
    warnOnceAboutCallerIdentity(callerIp) {
        if (this.warnedAboutCallerIdentity) {
            return;
        }
        this.warnedAboutCallerIdentity = true;
        this.logger.warn(`Per-caller rate limiting on password reset is disabled: "${callerIp ?? ''}" does not ` +
            'identify a client. Behind a proxy this means `trust proxy` is not set correctly in ' +
            'main.ts. The per-address limit is unaffected.');
    }
    deliver(to, token) {
        const resetUrl = `${this.frontendUrl()}${RESET_PATH}?token=${encodeURIComponent(token)}`;
        const delivery = this.mailer
            .send({
            to,
            subject: 'Réinitialiser ton mot de passe Tambouille',
            text: plainTextEmail(resetUrl),
            html: htmlEmail(resetUrl),
        })
            .then((sent) => {
            if (!sent) {
                this.logger.error('Envoi du mail de réinitialisation impossible — voir le log de MailService pour la cause.');
            }
        });
        this.pending.add(delivery);
        void delivery.finally(() => this.pending.delete(delivery));
    }
    frontendUrl() {
        const url = this.config.get('FRONTEND_URL') ?? 'http://localhost:5173';
        return url.replace(/\/+$/, '');
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = PasswordResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], PasswordResetService);
function plainTextEmail(resetUrl) {
    return [
        'Bonjour,',
        '',
        'Tu as demandé à réinitialiser ton mot de passe Tambouille.',
        'Choisis-en un nouveau ici :',
        resetUrl,
        '',
        'Ce lien est valable une heure et ne fonctionne qu’une seule fois.',
        '',
        'Si tu n’as rien demandé, ignore ce message : ton mot de passe reste inchangé.',
        '',
        '— Tambouille',
    ].join('\n');
}
function htmlEmail(resetUrl) {
    return [
        '<p>Bonjour,</p>',
        '<p>Tu as demandé à réinitialiser ton mot de passe Tambouille.</p>',
        `<p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>`,
        '<p>Ce lien est valable une heure et ne fonctionne qu’une seule fois.</p>',
        '<p>Si tu n’as rien demandé, ignore ce message : ton mot de passe reste inchangé.</p>',
        '<p>— Tambouille</p>',
    ].join('\n');
}
//# sourceMappingURL=password-reset.service.js.map