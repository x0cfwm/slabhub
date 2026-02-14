import { IsString, IsBoolean, IsOptional, IsArray, Matches, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @ValidateIf((o) => o.isActive === true)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Handle can only contain lowercase letters, numbers, and hyphens',
    })
    handle?: string;

    @IsOptional()
    @IsString()
    shopName?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    locationCountry?: string;

    @IsOptional()
    @IsString()
    locationCity?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    paymentsAccepted?: string[];

    @IsOptional()
    @IsBoolean()
    meetupsEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    shippingEnabled?: boolean;

    @IsOptional()
    socials?: {
        instagram?: string;
        tiktok?: string;
        discord?: string;
        tcgplayer?: string;
        ebay?: string;
    };

    @IsOptional()
    @IsString()
    wishlistText?: string;
}
