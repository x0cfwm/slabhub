import { BadRequestException } from '@nestjs/common';
import { PostingService } from './posting.service';
import {
    PostingGenerationTarget,
    PostingSelectionMode,
} from './dto/generate-post.dto';

describe('PostingService', () => {
    const userId = 'user-1';

    const inventoryItems = [
        {
            id: 'item-1',
            statusId: 'status-listed',
            status: { name: 'Listed' },
            stage: 'LISTED',
            productName: null,
            cardProfile: { name: 'Pikachu Promo', setCode: 'XY', cardNumber: '001', imageUrl: 'https://cdn/img1.jpg' },
            gradeValue: '10',
            condition: 'NM',
            listingPrice: 35000,
            marketPrice: null,
            marketPriceSnapshot: null,
            photos: [],
        },
        {
            id: 'item-2',
            statusId: 'status-sold',
            status: { name: 'Sold' },
            stage: 'SOLD',
            productName: 'One Piece Lot',
            cardProfile: null,
            gradeValue: null,
            condition: null,
            listingPrice: 9000,
            marketPrice: null,
            marketPriceSnapshot: null,
            photos: ['https://cdn/img2.jpg'],
        },
    ];

    const inventoryService = {
        listItems: jest.fn(),
    };

    const prisma = {};

    const buildService = () => new PostingService(prisma as any, inventoryService as any);

    beforeEach(() => {
        jest.clearAllMocks();
        inventoryService.listItems.mockResolvedValue(inventoryItems);
    });

    it('generates post content from selected status', async () => {
        const service = buildService();

        const result = await service.generatePost(userId, {
            selectionMode: PostingSelectionMode.BY_STATUS,
            statusIds: ['status-listed'],
            textOptions: {
                platform: 'INSTAGRAM',
                tone: 'HYPE',
                includePrice: true,
                includeHashtags: true,
                includeCta: true,
            },
            visualOptions: {
                template: 'GRID',
                ratio: '4:5',
                showPriceBadge: true,
            },
        } as any);

        expect(result.itemCount).toBe(1);
        expect(result.caption).toContain('1️⃣ Pikachu Promo');
        expect(result.imageDataUrl[0]).toContain('data:image/svg+xml');
    });

    it('throws when no status or item selection is provided', async () => {
        const service = buildService();

        await expect(
            service.generatePost(userId, {
                selectionMode: PostingSelectionMode.BY_STATUS,
                statusIds: [],
                textOptions: {
                    platform: 'INSTAGRAM',
                    tone: 'HYPE',
                },
                visualOptions: {
                    template: 'GRID',
                    ratio: '4:5',
                },
            } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses a safe inner frame for 9:16 reel layouts', () => {
        const service = buildService() as any;

        expect(service.getLayoutFrame('9:16', 1080, 1920)).toEqual({
            x: 54,
            y: 180,
            width: 972,
            height: 1400,
        });

        expect(service.getLayoutFrame('4:5', 1080, 1350)).toEqual({
            x: 0,
            y: 0,
            width: 1080,
            height: 1350,
        });
    });
});
