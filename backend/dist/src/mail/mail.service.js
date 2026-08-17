"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer_1 = require("nodemailer");
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter;
    from;
    constructor(config) {
        this.config = config;
    }
    getTransporter() {
        if (this.transporter) {
            return this.transporter;
        }
        const host = this.required('SMTP_HOST');
        const from = this.required('SMTP_FROM');
        const rawPort = this.config.get('SMTP_PORT') ?? '465';
        const port = Number(rawPort);
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
            throw new Error(`Invalid environment variable: SMTP_PORT must be a port number, got "${rawPort}"`);
        }
        const rawSecure = this.config.get('SMTP_SECURE');
        if (rawSecure !== undefined &&
            rawSecure !== 'true' &&
            rawSecure !== 'false') {
            throw new Error(`Invalid environment variable: SMTP_SECURE must be "true" or "false", got "${rawSecure}"`);
        }
        const secure = rawSecure === undefined ? port === 465 : rawSecure === 'true';
        const user = this.config.get('SMTP_USER');
        const password = user ? this.required('SMTP_PASSWORD') : undefined;
        this.from = from;
        this.transporter = (0, nodemailer_1.createTransport)({
            host,
            port,
            secure,
            ...(user ? { auth: { user, pass: password } } : {}),
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
        });
        return this.transporter;
    }
    required(name) {
        const value = this.config.get(name);
        if (!value) {
            throw new Error(`Missing required environment variable: ${name}`);
        }
        return value;
    }
    async onModuleInit() {
        try {
            await this.getTransporter().verify();
            this.logger.log('SMTP transport ready');
        }
        catch (error) {
            const err = error instanceof Error ? error : undefined;
            this.logger.error(`SMTP transport unavailable: ${err?.message ?? String(error)}`, err?.stack);
        }
    }
    async send(mail) {
        try {
            const transporter = this.getTransporter();
            await transporter.sendMail({ from: this.from, ...mail });
            return true;
        }
        catch (error) {
            const err = error instanceof Error ? error : undefined;
            this.logger.error(`Failed to send "${mail.subject}" to ${maskAddress(mail.to)}: ${err?.message ?? String(error)}`, err?.stack);
            return false;
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
function maskAddress(address) {
    const at = address.lastIndexOf('@');
    return at === -1 ? '***' : `***${address.slice(at)}`;
}
//# sourceMappingURL=mail.service.js.map