import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
    @ApiProperty({ description: 'The email of the user', example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'The 6-digit OTP code', example: '123456' })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;

    @ApiProperty({ description: 'Optional invite token', required: false })
    @IsString()
    @IsOptional()
    inviteToken?: string;
}
