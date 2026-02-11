import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(userId: string | undefined, sellerId: string | undefined): Promise<{
        id: string;
        email: string;
        profile: {
            id: any;
            handle: any;
            shopName: any;
            isActive: any;
            locationCountry: any;
            locationCity: any;
            paymentsAccepted: any;
            meetupsEnabled: any;
            shippingEnabled: any;
            socials: any;
            wishlistText: any;
            createdAt: any;
            updatedAt: any;
        } | null;
    }>;
    updateProfile(userId: string | undefined, dto: UpdateProfileDto): Promise<{
        id: any;
        email: any;
        profile: {
            id: any;
            handle: any;
            shopName: any;
            isActive: any;
            locationCountry: any;
            locationCity: any;
            paymentsAccepted: any;
            meetupsEnabled: any;
            shippingEnabled: any;
            socials: any;
            wishlistText: any;
            createdAt: any;
            updatedAt: any;
        };
    }>;
}
