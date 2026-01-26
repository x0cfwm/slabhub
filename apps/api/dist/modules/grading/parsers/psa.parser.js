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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PsaParser = void 0;
const cheerio = __importStar(require("cheerio"));
class PsaParser {
    static parse(html, certNumber) {
        const $ = cheerio.load(html);
        const data = {};
        $('table.table tr').each((_, el) => {
            const label = $(el).find('th').text().trim().replace(':', '');
            const value = $(el).find('td').text().trim();
            if (label && value) {
                data[label] = value;
            }
        });
        const cardName = data['Card'] || data['Description'] ||
            (data['Brand'] && data['Subject'] ? `${data['Brand']} ${data['Subject']}` : data['Brand'] || data['Subject']) ||
            $('h1').first().text().trim();
        const setName = data['Set'] || data['Year'] || '';
        const gradeLabel = data['Grade'] || $('.cert-grade-label').text().trim() || '';
        const cardNumber = data['Card Number'] || '';
        const gradeMatch = gradeLabel.match(/(\d+(\.\d+)?)/);
        const gradeValue = gradeMatch ? parseFloat(gradeMatch[1]) : gradeLabel;
        if (!cardName && !gradeLabel) {
            return {
                grader: 'PSA',
                certNumber,
                success: false,
                error: 'Could not parse PSA certificate page contents',
            };
        }
        return {
            grader: 'PSA',
            certNumber,
            success: true,
            data: {
                gradeLabel,
                gradeValue,
                cardName,
                setName,
                cardNumber,
                year: data['Year'],
                variant: data['Variety'] || data['Variety/Pedigree'],
                population: data['Population'] ? parseInt(data['Population'].replace(/,/g, '')) : undefined,
                raw: data,
            },
        };
    }
}
exports.PsaParser = PsaParser;
//# sourceMappingURL=psa.parser.js.map