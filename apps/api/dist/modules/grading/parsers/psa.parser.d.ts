import { GradingLookupResult } from '../types/grading.types';
export declare class PsaParser {
    static parse(html: string, certNumber: string): GradingLookupResult;
}
