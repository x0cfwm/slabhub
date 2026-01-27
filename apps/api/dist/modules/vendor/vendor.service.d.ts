import { PrismaService } from '../prisma/prisma.service';
export declare class VendorService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getVendorPage(handle: string): Promise<{
        profile: {
            handle: string;
            shopName: string;
            isActive: boolean;
            locationCountry: string;
            locationCity: string;
            paymentsAccepted: string[];
            meetupsEnabled: boolean;
            shippingEnabled: boolean;
            socials: import("@prisma/client/runtime/library").JsonValue;
            wishlistText: string;
        };
        items: ({
            id: string;
            stage: import("@prisma/client").$Enums.InventoryStage;
            quantity: number;
            listingPrice: number | null;
            acquisitionPrice: number | null;
            createdAt: string;
        } | {
            type: string;
            cardVariantId: string | null;
            condition: import("@prisma/client").$Enums.Condition | null;
            cardProfile: {
                id: string;
                name: string;
                set: string;
                rarity: string;
                cardNumber: string;
                imageUrl: string;
            } | null;
            pricing: {
                rawPrice: number;
                sealedPrice: number | null;
                source: string;
                updatedAt: string;
            } | null;
            id: string;
            stage: import("@prisma/client").$Enums.InventoryStage;
            quantity: number;
            listingPrice: number | null;
            acquisitionPrice: number | null;
            createdAt: string;
        } | {
            type: string;
            cardVariantId: string | null;
            gradingCompany: import("@prisma/client").$Enums.GradeProvider | null;
            grade: string | null;
            certNumber: string | null;
            slabImages: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
            cardProfile: {
                id: string;
                name: string;
                set: string;
                rarity: string;
                cardNumber: string;
                imageUrl: string;
            } | null;
            pricing: {
                rawPrice: number;
                sealedPrice: number | null;
                source: string;
                updatedAt: string;
            } | null;
            id: string;
            stage: import("@prisma/client").$Enums.InventoryStage;
            quantity: number;
            listingPrice: number | null;
            acquisitionPrice: number | null;
            createdAt: string;
        } | {
            type: string;
            productName: string | null;
            productType: import("@prisma/client").$Enums.ProductType | null;
            language: string | null;
            setName: string | null;
            edition: string | null;
            integrity: import("@prisma/client").$Enums.SealedIntegrity | null;
            configuration: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
            id: string;
            stage: import("@prisma/client").$Enums.InventoryStage;
            quantity: number;
            listingPrice: number | null;
            acquisitionPrice: number | null;
            createdAt: string;
        })[];
        itemCount: number;
    }>;
}
