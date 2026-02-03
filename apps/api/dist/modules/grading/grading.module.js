"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const grading_controller_1 = require("./grading.controller");
const grading_service_1 = require("./grading.service");
const grading_http_client_1 = require("./http/grading-http.client");
let GradingModule = class GradingModule {
};
exports.GradingModule = GradingModule;
exports.GradingModule = GradingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 100,
                }]),
        ],
        controllers: [grading_controller_1.GradingController],
        providers: [
            grading_service_1.GradingService,
            grading_http_client_1.GradingHttpClient,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
        exports: [grading_service_1.GradingService],
    })
], GradingModule);
//# sourceMappingURL=grading.module.js.map