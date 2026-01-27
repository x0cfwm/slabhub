"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BgsParser = void 0;
class BgsParser {
    static parse(html, certNumber) {
        return {
            grader: 'BGS',
            certNumber,
            success: false,
            error: 'BGS parsing not yet configured',
        };
    }
}
exports.BgsParser = BgsParser;
//# sourceMappingURL=bgs.parser.js.map