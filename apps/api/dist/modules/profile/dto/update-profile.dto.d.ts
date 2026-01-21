export declare class UpdateProfileDto {
    handle?: string;
    shopName?: string;
    isActive?: boolean;
    locationCountry?: string;
    locationCity?: string;
    paymentsAccepted?: string[];
    meetupsEnabled?: boolean;
    shippingEnabled?: boolean;
    socials?: {
        instagram?: string;
        tiktok?: string;
        discord?: string;
        tcgplayer?: string;
        ebay?: string;
    };
    wishlistText?: string;
}
