import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfileService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(sellerId: string): Promise<{
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
    updateProfile(sellerId: string, dto: UpdateProfileDto): Promise<{
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
    private transformProfile;
}
