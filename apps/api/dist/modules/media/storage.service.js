"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
class StorageService {
    generateUniqueName(originalName) {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const ext = originalName.split('.').pop();
        return `${timestamp}-${random}.${ext}`;
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=storage.service.js.map