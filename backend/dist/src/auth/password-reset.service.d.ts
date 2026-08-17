import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare const RESPONSE_FLOOR_MS = 500;
export declare class SlidingWindow {
    private readonly limit;
    private readonly windowMs;
    private readonly maxKeys;
    private readonly hits;
    private callsSinceSweep;
    constructor(limit: number, windowMs: number, maxKeys: number);
    tryConsume(key: string): boolean;
    get size(): number;
    private sweep;
}
export declare function callerIdentity(ip: string | undefined): string | null;
export declare class PasswordResetService {
    private readonly prisma;
    private readonly mailer;
    private readonly config;
    private readonly logger;
    private readonly perAddress;
    private readonly perCaller;
    private readonly pending;
    private warnedAboutCallerIdentity;
    constructor(prisma: PrismaService, mailer: MailService, config: ConfigService);
    forgot(email: string, callerIp?: string): Promise<void>;
    private attemptForgot;
    reset(token: string, password: string): Promise<void>;
    flushDeliveries(): Promise<void>;
    private holdUntilFloor;
    private warnOnceAboutCallerIdentity;
    private deliver;
    private frontendUrl;
}
