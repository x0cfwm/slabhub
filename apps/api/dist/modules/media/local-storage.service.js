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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const common_1 = require("@nestjs/common");
const storage_service_1 = require("./storage.service");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const config_1 = require("@nestjs/config");
let LocalStorageService = class LocalStorageService extends storage_service_1.StorageService {
    constructor(configService) {
        super();
        this.configService = configService;
        this.uploadDir = path.join(process.cwd(), 'uploads');
        const port = this.configService.get('PORT') || '3001';
        this.baseUrl = `http://localhost:${port}/uploads`;
        this.ensureUploadDir();
    }
    async ensureUploadDir() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create upload directory', error);
        }
    }
    async uploadFile(file, folder = '') {
        try {
            const fileName = this.generateUniqueName(file.originalname);
            const targetFolder = path.join(this.uploadDir, folder);
            await fs.mkdir(targetFolder, { recursive: true });
            const filePath = path.join(targetFolder, fileName);
            await fs.writeFile(filePath, file.buffer);
            const relativePath = folder ? `${folder}/${fileName}` : fileName;
            return `${this.baseUrl}/${relativePath}`;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to upload file locally');
        }
    }
    async deleteFile(fileUrl) {
        try {
            const relativePath = fileUrl.replace(this.baseUrl, '');
            if (!relativePath || relativePath === fileUrl) {
                console.warn(`URL does not match baseUrl: ${fileUrl}`);
                return;
            }
            const sanitizedPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
            const filePath = path.join(this.uploadDir, sanitizedPath);
            await fs.unlink(filePath);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`File already deleted: ${fileUrl}`);
            }
            else {
                console.warn(`Failed to delete file: ${fileUrl}`, error);
            }
        }
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LocalStorageService);
//# sourceMappingURL=local-storage.service.js.map