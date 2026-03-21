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

    const prisma = {
        generatedPost: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
    };

    const buildService = () => new PostingService(prisma as any, inventoryService as any);

    beforeEach(() => {
        jest.clearAllMocks();
        inventoryService.listItems.mockResolvedValue(inventoryItems);
        prisma.generatedPost.create.mockResolvedValue({
            id: 'post-1',
            createdAt: new Date('2026-03-21T20:00:00.000Z'),
        });
        prisma.generatedPost.findFirst.mockResolvedValue(null);
        prisma.generatedPost.findMany.mockResolvedValue([]);
    });

    it('generates post content from selected status and stores history', async () => {
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
        expect(result.caption).toContain('Fresh drop');
        expect(result.caption).toContain('Pikachu Promo');
        expect(result.imageDataUrl).toContain('data:image/svg+xml');

        expect(prisma.generatedPost.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId,
                    selectionMode: PostingSelectionMode.BY_STATUS,
                    statusIds: ['status-listed'],
                    itemIds: ['item-1'],
                    generationTarget: PostingGenerationTarget.BOTH,
                    generatedItemCount: 1,
                }),
            }),
        );
    });

    it('reuses previous image for TEXT_ONLY regeneration', async () => {
        const service = buildService();

        prisma.generatedPost.findFirst.mockResolvedValueOnce({
            id: 'prev-1',
            userId,
            caption: 'old caption',
            imageDataUrl: 'data:image/svg+xml,old',
        });

        await service.generatePost(userId, {
            selectionMode: PostingSelectionMode.MANUAL,
            itemIds: ['item-1'],
            generationTarget: PostingGenerationTarget.TEXT_ONLY,
            previousPostId: 'prev-1',
            textOptions: {
                platform: 'FACEBOOK',
                tone: 'CONCISE',
                includePrice: true,
            },
            visualOptions: {
                template: 'COLLAGE',
                ratio: '1:1',
            },
        } as any);

        expect(prisma.generatedPost.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    imageDataUrl: 'data:image/svg+xml,old',
                    generationTarget: PostingGenerationTarget.TEXT_ONLY,
                }),
            }),
        );
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
});
