import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Grader } from '../types/grading.types';

export class GradingLookupDto {
    @IsEnum(['PSA', 'BGS', 'CGC', 'SGC', 'ARS'])
    @IsNotEmpty()
    grader: Grader;

    @IsString()
    @IsNotEmpty()
    certNumber: string;
}
