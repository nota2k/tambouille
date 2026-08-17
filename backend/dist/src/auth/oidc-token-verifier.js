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
exports.OidcTokenVerifier = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jose_1 = require("jose");
const ACCEPTED_ALGORITHMS = ['RS256'];
let OidcTokenVerifier = class OidcTokenVerifier {
    config;
    jwks;
    issuer;
    clientId;
    constructor(config) {
        this.config = config;
    }
    getJwks() {
        if (!this.jwks) {
            const issuer = this.config.get('KEYCLOAK_ISSUER');
            if (!issuer) {
                throw new Error('Missing required environment variable: KEYCLOAK_ISSUER');
            }
            const clientId = this.config.get('KEYCLOAK_CLIENT_ID');
            if (!clientId) {
                throw new Error('Missing required environment variable: KEYCLOAK_CLIENT_ID');
            }
            this.issuer = issuer.replace(/\/+$/, '');
            this.clientId = clientId;
            this.jwks = (0, jose_1.createRemoteJWKSet)(new URL(`${this.issuer}/protocol/openid-connect/certs`));
        }
        return this.jwks;
    }
    async verify(idToken) {
        const jwks = this.getJwks();
        const issuer = this.issuer;
        const audience = this.clientId;
        let payload;
        try {
            ({ payload } = await (0, jose_1.jwtVerify)(idToken, jwks, {
                issuer,
                audience,
                algorithms: ACCEPTED_ALGORITHMS,
            }));
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid Keycloak token');
        }
        const subject = payload.sub;
        const email = payload['email'];
        if (typeof subject !== 'string' ||
            !subject ||
            typeof email !== 'string' ||
            !email) {
            throw new common_1.UnauthorizedException('Invalid Keycloak token');
        }
        const name = payload['name'];
        return {
            subject,
            email,
            emailVerified: payload['email_verified'] === true,
            displayName: typeof name === 'string' && name ? name : email.split('@')[0],
        };
    }
};
exports.OidcTokenVerifier = OidcTokenVerifier;
exports.OidcTokenVerifier = OidcTokenVerifier = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OidcTokenVerifier);
//# sourceMappingURL=oidc-token-verifier.js.map