"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceRefConstraint = void 0;
const class_validator_1 = require("class-validator");
const mixcloud_service_1 = require("../../mixcloud/mixcloud.service");
const node_net_1 = require("node:net");
let SourceRefConstraint = class SourceRefConstraint {
    validate(value, args) {
        if (typeof value !== 'string')
            return false;
        const sourceType = args.object.sourceType;
        if (sourceType === 'mixcloud')
            return mixcloud_service_1.KEY_PATTERN.test(value);
        if (sourceType === 'remote') {
            let url;
            try {
                url = new URL(value);
            }
            catch {
                return false;
            }
            if (url.protocol !== 'https:')
                return false;
            const host = url.hostname.replace(/^\[|\]$/g, '');
            if ((0, node_net_1.isIP)(host))
                return false;
            return true;
        }
        if (sourceType === 'soundcloud') {
            try {
                const url = new URL(value);
                if (url.protocol !== 'https:')
                    return false;
                const host = url.hostname.toLowerCase();
                return host === 'soundcloud.com' || host.endsWith('.soundcloud.com');
            }
            catch {
                return false;
            }
        }
        return false;
    }
    defaultMessage() {
        return 'sourceRef is not valid for this sourceType';
    }
};
exports.SourceRefConstraint = SourceRefConstraint;
exports.SourceRefConstraint = SourceRefConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'sourceRef', async: false })
], SourceRefConstraint);
//# sourceMappingURL=source-ref.constraint.js.map