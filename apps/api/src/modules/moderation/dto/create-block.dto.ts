import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBlockDto {
    @ApiProperty({ required: false, description: 'Direct user id to block (mutually exclusive with handle)' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiProperty({ required: false, description: 'Vendor handle to block (resolved to user on the server)' })
    @IsOptional()
    @IsString()
    handle?: string;
}
