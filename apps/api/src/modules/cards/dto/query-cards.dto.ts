import { IsOptional, IsString } from 'class-validator';

export class QueryCardsDto {
    @IsOptional()
    @IsString()
    query?: string;
}
