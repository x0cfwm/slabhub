import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    getProfile(sellerId: string | undefined): Promise<{
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
    }>;
    updateProfile(sellerId: string | undefined, dto: UpdateProfileDto): Promise<{
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
    }>;
}
