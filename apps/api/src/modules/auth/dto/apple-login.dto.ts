import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @ApiProperty({
    description: 'Apple identity token received from the mobile app',
    example: 'eyJraWQiOiJ...',
  })
  @IsNotEmpty()
  @IsString()
  identityToken: string;

  @ApiProperty({
    description: 'Full name from Apple (only available on first login)',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: 'Invite token for registration',
    required: false,
  })
  @IsOptional()
  @IsString()
  inviteToken?: string;
}
