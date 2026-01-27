import { Controller, Post, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingLookupDto } from './dto/lookup.dto';
import { GradingLookupResult } from './types/grading.types';

@Controller('grading')
export class GradingController {
    constructor(private readonly gradingService: GradingService) { }

    @Post('lookup')
    @HttpCode(HttpStatus.OK)
    async lookup(@Body() lookupDto: GradingLookupDto): Promise<GradingLookupResult> {
        return this.gradingService.lookup(lookupDto);
    }
}
