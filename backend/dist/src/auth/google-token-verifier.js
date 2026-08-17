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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleTokenVerifier = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
let GoogleTokenVerifier = class GoogleTokenVerifier {
    config;
    client;
    clientId;
    constructor(config) {
        this.config = config;
    }
    getClient() {
        if (!this.client) {
            const clientId = this.config.get('GOOGLE_CLIENT_ID');
            if (!clientId) {
                throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
            }
            this.clientId = clientId;
            this.client = new google_auth_library_1.OAuth2Client(clientId);
        }
        return this.client;
    }
    async verify(idToken) {
        const client = this.getClient();
        const audience = this.clientId;
        let payload;
        try {
            const ticket = await client.verifyIdToken({ idToken, audience });
            payload = ticket.getPayload();
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
        if (!payload?.sub || !payload.email) {
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
        return {
            googleId: payload.sub,
            email: payload.email,
            emailVerified: payload.email_verified === true,
            displayName: payload.name ?? payload.email.split('@')[0],
        };
    }
};
exports.GoogleTokenVerifier = GoogleTokenVerifier;
exports.GoogleTokenVerifier = GoogleTokenVerifier = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleTokenVerifier);
//# sourceMappingURL=google-token-verifier.js.map