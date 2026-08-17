"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionalUserId = exports.CurrentUserId = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUserId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.userId;
});
exports.OptionalUserId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.userId;
});
//# sourceMappingURL=current-user.decorator.js.map