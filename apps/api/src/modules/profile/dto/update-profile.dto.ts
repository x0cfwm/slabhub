import { IsString, IsBoolean, IsOptional, IsArray, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ReferenceLinkDto {
    @ApiProperty({ example: 'My Shop' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'https://example.com' })
    @IsString()
    url: string;
}

class UpcomingEventDto {
    @ApiProperty({ example: 'Card Show 2024' })
    @IsString()
    name: string;

    @ApiProperty({ required: false, example: '2024-12-01' })
    @IsOptional()
    @IsString()
    date?: string;

    @ApiProperty({ required: false, example: 'New York' })
    @IsOptional()
    @IsString()
    location?: string;
}

export class UpdateProfileDto {
    @ApiProperty({ required: false, example: 'johndoe' })
    @IsOptional()
    @IsString()
    @ValidateIf((o) => o.isActive === true)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Handle can only contain lowercase letters, numbers, and hyphens',
    })
    handle?: string;

    @ApiProperty({ required: false, example: 'John\'s Card Shop' })
    @IsOptional()
    @IsString()
    shopName?: string;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false, example: 'Singapore, Singapore City' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({ required: false, type: [String], example: ['PayPal', 'Stripe'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    paymentsAccepted?: string[];

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @IsBoolean()
    meetupsEnabled?: boolean;

    @ApiProperty({ required: false, example: true })
    @IsOptional()
    @IsBoolean()
    shippingEnabled?: boolean;

    @ApiProperty({ required: false, type: [String], example: ['shipping', 'meetups_local'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fulfillmentOptions?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    socials?: {
        instagram?: string;
        tiktok?: string;
        discord?: string;
        tcgplayer?: string;
        ebay?: string;
    };

    @ApiProperty({ required: false, example: 'Looking for One Piece cards!' })
    @IsOptional()
    @IsString()
    wishlistText?: string;

    @ApiProperty({ required: false, type: [ReferenceLinkDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReferenceLinkDto)
    referenceLinks?: ReferenceLinkDto[];

    @ApiProperty({ required: false, type: [UpcomingEventDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpcomingEventDto)
    upcomingEvents?: UpcomingEventDto[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    avatarId?: string;

    @ApiProperty({ required: false, description: 'Display the Facebook Verified badge on the public shop page. Requires a linked Facebook account to take effect.' })
    @IsOptional()
    @IsBoolean()
    showFacebookBadge?: boolean;
}
