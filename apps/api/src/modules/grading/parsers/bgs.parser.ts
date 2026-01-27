import { GradingLookupResult } from '../types/grading.types';

export class BgsParser {
    static parse(html: string, certNumber: string): GradingLookupResult {
        // BGS parsing not yet implemented
        return {
            grader: 'BGS',
            certNumber,
            success: false,
            error: 'BGS parsing not yet configured',
        };
    }
}
