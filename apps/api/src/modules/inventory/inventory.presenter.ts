import { Injectable } from '@nestjs/common';
import { MediaService } from '../media/media.service';

@Injectable()
export class InventoryPresenter {
    constructor(private readonly mediaService: MediaService) { }

    transformItem(item: any) {
        let cardProfile = null;
        if (item.cardVariant?.card) {
            cardProfile = {
                id: item.cardVariant.card.id,
                name: item.cardVariant.card.name,
                set: item.cardVariant.card.set,
                rarity: item.cardVariant.card.rarity,
                cardNumber: item.cardVariant.card.cardNumber,
                imageUrl: item.cardVariant.card.imageUrl,
                setCode: item.cardVariant.card.set,
            };
        } else if (item.refPriceChartingProduct) {
            cardProfile = {
                id: item.refPriceChartingProduct.id,
                name: item.refPriceChartingProduct.title || 'Unknown',
                set: item.refPriceChartingProduct.set?.name || 'Unknown',
                setCode: item.refPriceChartingProduct.set?.code || item.setCode,
                rarity: '',
                cardNumber: item.refPriceChartingProduct.cardNumber || item.cardNumber || '',
                imageUrl: this.mediaService.ensureCdnUrl(item.refPriceChartingProduct.imageUrl) || '',
                rawPrice: item.refPriceChartingProduct.rawPrice ? Number(item.refPriceChartingProduct.rawPrice) : null,
                sealedPrice: item.refPriceChartingProduct.sealedPrice ? Number(item.refPriceChartingProduct.sealedPrice) : null,
            };
        } else if (item.productName) {
            cardProfile = {
                id: null,
                name: item.productName,
                set: item.setName || 'Unknown',
                setCode: item.setCode || '',
                rarity: '',
                cardNumber: item.cardNumber || '',
                imageUrl: (item.photos && (item.photos as string[]).length > 0) ? (item.photos as string[])[0] : '',
            };
        }

        const base = {
            id: item.id,
            stage: item.stage,
            acquisitionPrice: item.acquisitionPrice
                ? Number(item.acquisitionPrice)
                : null,
            listingPrice: item.listingPrice ? Number(item.listingPrice) : null,
            soldPrice: item.soldPrice ? Number(item.soldPrice) : null,
            soldDate: item.soldDate?.toISOString?.() || null,
            marketPriceSnapshot: item.marketPriceSnapshot
                ? Number(item.marketPriceSnapshot)
                : null,
            marketPrice: item.marketPriceSnapshot ? Number(item.marketPriceSnapshot) : null,
            acquisitionDate: item.acquisitionDate?.toISOString?.() || null,
            acquisitionSource: item.acquisitionSource,
            storageLocation: item.storageLocation,
            notes: item.notes,
            sellingDescription: item.sellingDescription,
            photos: item.photos || [],
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            quantity: item.quantity,
            sortOrder: item.sortOrder,
            statusId: item.statusId,
            status: item.status,
            frontMediaId: item.frontMediaId,
            backMediaId: item.backMediaId,
            frontMediaUrl: item.frontMedia
                ? this.mediaService.getPublicUrl(item.frontMedia, { preferCdn: true })
                : null,
            backMediaUrl: item.backMedia
                ? this.mediaService.getPublicUrl(item.backMedia, { preferCdn: true })
                : null,
        };

        if (item.itemType === 'SINGLE_CARD_RAW') {
            return {
                ...base,
                type: 'SINGLE_CARD_RAW',
                cardVariantId: item.cardVariantId,
                refPriceChartingProductId: item.refPriceChartingProductId,
                condition: item.condition,
                cardProfile,
            };
        }

        if (item.itemType === 'SINGLE_CARD_GRADED') {
            return {
                ...base,
                type: 'SINGLE_CARD_GRADED',
                cardVariantId: item.cardVariantId,
                refPriceChartingProductId: item.refPriceChartingProductId,
                gradingCompany: item.gradeProvider,
                grade: item.gradeValue,
                gradeProvider: item.gradeProvider,
                gradeValue: item.gradeValue,
                certNumber: item.certNumber,
                gradingCost: item.gradingCost ? Number(item.gradingCost) : null,
                slabImages: item.slabImages || {},
                gradingMeta: item.gradingMeta || {},
                previousCertNumbers: item.previousCertNumbers || [],
                cardProfile,
            };
        }

        if (item.itemType === 'SEALED_PRODUCT') {
            return {
                ...base,
                type: 'SEALED_PRODUCT',
                productName: item.productName,
                productType: item.productType,
                language: item.language,
                setName: item.setName,
                edition: item.edition,
                integrity: item.integrity,
                configuration: item.configuration || {},
            };
        }

        return base;
    }
}
