import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
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
