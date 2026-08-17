"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const mail_module_1 = require("./mail.module");
const mail_service_1 = require("./mail.service");
let MailTestModule = class MailTestModule {
};
MailTestModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule.forRoot({ isGlobal: true }), mail_module_1.MailModule],
    })
], MailTestModule);
async function main() {
    const to = process.argv[2];
    if (!to) {
        console.error('Usage: npm run mail:test -- <address>');
        process.exit(1);
    }
    const context = await core_1.NestFactory.createApplicationContext(MailTestModule);
    const mail = context.get(mail_service_1.MailService);
    const sent = await mail.send({
        to,
        subject: 'Tambouille — test SMTP',
        text: 'Si tu lis ceci, la configuration SMTP fonctionne.',
    });
    await context.close();
    if (sent) {
        console.log(`OK: message accepted for ${to}`);
        process.exit(0);
    }
    console.error('FAILED: see the error logged above');
    process.exit(1);
}
void main();
//# sourceMappingURL=mail-test.js.map