import { GradingService } from './grading.service';
import { GradingLookupDto } from './dto/lookup.dto';
import { GradingLookupResult } from './types/grading.types';
export declare class GradingController {
    private readonly gradingService;
    constructor(gradingService: GradingService);
    lookup(lookupDto: GradingLookupDto): Promise<GradingLookupResult>;
}
