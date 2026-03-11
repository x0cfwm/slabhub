import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
    @ApiProperty({ description: 'The email of the user to send OTP to', example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Optional invite token for registration', required: false })
    @IsString()
    @IsOptional()
    inviteToken?: string;
}
