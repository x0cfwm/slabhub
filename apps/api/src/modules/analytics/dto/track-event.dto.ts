import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShopEventType } from '@prisma/client';

export class TrackEventDto {
  @ApiProperty({ enum: ShopEventType, example: ShopEventType.VIEW_SHOP })
  @IsEnum(ShopEventType)
  type: ShopEventType;

  @ApiProperty({ description: 'Shop handle or profile ID', example: 'nami-treasures' })
  @IsString()
  handle: string;

  @ApiProperty({ description: 'Optional inventory item ID', required: false })
  @IsString()
  @IsOptional()
  itemId?: string;

  @ApiProperty({ description: 'Optional referral channel', required: false, example: 'discord' })
  @IsString()
  @IsOptional()
  channel?: string;
}
