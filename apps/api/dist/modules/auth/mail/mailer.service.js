"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MailerConsoleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerConsoleService = exports.MailerService = void 0;
const common_1 = require("@nestjs/common");
let MailerService = class MailerService {
};
exports.MailerService = MailerService;
exports.MailerService = MailerService = __decorate([
    (0, common_1.Injectable)()
], MailerService);
let MailerConsoleService = MailerConsoleService_1 = class MailerConsoleService extends MailerService {
    constructor() {
        super(...arguments);
        this.logger = new common_1.Logger(MailerConsoleService_1.name);
    }
    async sendOtp(email, otp) {
        this.logger.log(`\n\n==========================================\nOTP for ${email}: ${otp}\n==========================================\n\n`);
    }
};
exports.MailerConsoleService = MailerConsoleService;
exports.MailerConsoleService = MailerConsoleService = MailerConsoleService_1 = __decorate([
    (0, common_1.Injectable)()
], MailerConsoleService);
//# sourceMappingURL=mailer.service.js.map