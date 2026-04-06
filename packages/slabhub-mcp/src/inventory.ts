import {
  Condition,
  GradeProvider,
  InventoryStage,
  ItemType,
  PrismaClient,
  ProductType,
  SealedIntegrity,
} from '@prisma/client';
import { z } from 'zod';
import type { AuthContext } from './auth.js';
import type { SlabhubMcpEnv } from './env.js';
import { buildMediaUrl, ensureCdnUrl } from './media.js';

const inventoryListInclude = {
  cardVariant: {
    include: {
      card: true,
    },
  },
  refPriceChartingProduct: {
    include: {
      set: true,
      sales: {
        orderBy: {
          date: 'desc',
        },
        take: 50,
      },
    },
  },
  frontMedia: true,
  backMedia: true,
  status: true,
} as const;

const inventoryDetailInclude = {
  ...inventoryListInclude,
} as const;

export const searchInventorySchema = z.object({
  query: z.string().trim().min(1).optional(),
  stage: z.nativeEnum(InventoryStage).optional(),
  statusSystemId: z.string().trim().min(1).optional(),
  itemType: z.nativeEnum(ItemType).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const getItemDetailsSchema = z.object({
  itemId: z.string().trim().min(1),
});

export const updateItemStatusSchema = z.object({
  itemId: z.string().trim().min(1),
  stage: z.nativeEnum(InventoryStage),
  listingPrice: z.number().min(0).optional(),
  soldPrice: z.number().min(0).optional(),
  soldDate: z.string().trim().min(1).optional(),
  statusId: z.string().trim().min(1).optional(),
  statusSystemId: z.string().trim().min(1).optional(),
});

export const listActiveListingsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  statusSystemId: z.string().trim().min(1).optional(),
});

export const createInventoryItemSchema = z.object({
  itemType: z.nativeEnum(ItemType),
  cardVariantId: z.string().trim().min(1).optional(),
  refPriceChartingProductId: z.string().trim().min(1).optional(),
  productName: z.string().trim().min(1).optional(),
  productType: z.nativeEnum(ProductType).optional(),
  language: z.string().trim().min(1).optional(),
  setName: z.string().trim().min(1).optional(),
  setCode: z.string().trim().min(1).optional(),
  cardNumber: z.string().trim().min(1).optional(),
  edition: z.string().trim().min(1).optional(),
  integrity: z.nativeEnum(SealedIntegrity).optional(),
  configuration: z.record(z.any()).optional(),
  gradeProvider: z.nativeEnum(GradeProvider).optional(),
  gradeValue: z.union([z.string().trim().min(1), z.number()]).optional(),
  certNumber: z.string().trim().min(1).optional(),
  certificationNumber: z.string().trim().min(1).optional(),
  gradingMeta: z.record(z.any()).optional(),
  gradingCost: z.number().min(0).optional(),
  slabImages: z.record(z.any()).optional(),
  condition: z.nativeEnum(Condition).optional(),
  quantity: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
  stage: z.nativeEnum(InventoryStage).default(InventoryStage.ACQUIRED),
  statusId: z.string().trim().min(1).optional(),
  listingPrice: z.number().min(0).optional(),
  soldPrice: z.number().min(0).optional(),
  soldDate: z.string().trim().min(1).optional(),
  acquisitionPrice: z.number().min(0).optional(),
  acquisitionDate: z.string().trim().min(1).optional(),
  acquisitionSource: z.string().trim().min(1).optional(),
  storageLocation: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  sellingDescription: z.string().trim().min(1).optional(),
  photos: z.array(z.string().trim().min(1)).default([]),
  frontMediaId: z.string().trim().min(1).optional(),
  backMediaId: z.string().trim().min(1).optional(),
});

type SearchInventoryInput = z.infer<typeof searchInventorySchema>;
type GetItemDetailsInput = z.infer<typeof getItemDetailsSchema>;
type UpdateItemStatusInput = z.infer<typeof updateItemStatusSchema>;
type ListActiveListingsInput = z.infer<typeof listActiveListingsSchema>;
type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export class SlabhubInventoryService {
  private readonly marketPriceCache = new Map<string, number | null>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly env: SlabhubMcpEnv,
  ) {}

  async searchInventory(userId: string, input: SearchInventoryInput) {
    const where: any = {
      userId,
    };

    if (input.stage) {
      where.stage = input.stage;
    }

    if (input.itemType) {
      where.itemType = input.itemType;
    }

    if (input.statusSystemId) {
      where.status = {
        is: {
          userId,
          systemId: input.statusSystemId,
        },
      };
    }

    if (input.query) {
      where.AND = [
        {
          OR: [
            { productName: { contains: input.query, mode: 'insensitive' } },
            { setName: { contains: input.query, mode: 'insensitive' } },
            { setCode: { contains: input.query, mode: 'insensitive' } },
            { cardNumber: { contains: input.query, mode: 'insensitive' } },
            { certNumber: { contains: input.query, mode: 'insensitive' } },
            { certificationNumber: { contains: input.query, mode: 'insensitive' } },
            { status: { is: { name: { contains: input.query, mode: 'insensitive' } } } },
            {
              cardVariant: {
                is: {
                  name: { contains: input.query, mode: 'insensitive' },
                },
              },
            },
            {
              cardVariant: {
                is: {
                  card: {
                    is: {
                      name: { contains: input.query, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
            {
              refPriceChartingProduct: {
                is: {
                  title: { contains: input.query, mode: 'insensitive' },
                },
              },
            },
            {
              refPriceChartingProduct: {
                is: {
                  set: {
                    is: {
                      name: { contains: input.query, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
            {
              refPriceChartingProduct: {
                is: {
                  set: {
                    is: {
                      code: { contains: input.query, mode: 'insensitive' },
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: inventoryListInclude as any,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: input.limit,
    });

    return {
      total: items.length,
      items: items.map((item) => this.transformItem(item)),
    };
  }

  async getItemDetails(userId: string, input: GetItemDetailsInput) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        id: input.itemId,
        userId,
      },
      include: inventoryDetailInclude as any,
    });

    if (!item) {
      throw new Error(`Inventory item ${input.itemId} not found.`);
    }

    const history = await this.prisma.inventoryHistory.findMany({
      where: {
        itemId: input.itemId,
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
    });

    const linkedProduct = item.refPriceChartingProduct as any;

    return {
      ...this.transformItem(item),
      linkedProduct: linkedProduct
        ? {
            id: linkedProduct.id,
            title: linkedProduct.title,
            productUrl: linkedProduct.productUrl,
            productType: linkedProduct.productType,
            imageUrl: ensureCdnUrl(linkedProduct.imageUrl, this.env),
            rawPrice: linkedProduct.rawPrice
              ? Number(linkedProduct.rawPrice)
              : null,
            sealedPrice: linkedProduct.sealedPrice
              ? Number(linkedProduct.sealedPrice)
              : null,
            set: linkedProduct.set
              ? {
                  id: linkedProduct.set.id,
                  name: linkedProduct.set.name,
                  code: linkedProduct.set.code,
                }
              : null,
            recentSales: linkedProduct.sales.map((sale: any) => ({
              id: sale.id,
              title: sale.title,
              price: Number(sale.price),
              date: sale.date.toISOString(),
              source: sale.source,
              grade: sale.grade,
              link: sale.link,
            })),
          }
        : null,
      history: history.map((entry: any) => ({
        id: entry.id,
        type: entry.type,
        fromStage: entry.fromStage,
        toStage: entry.toStage,
        fromStatusId: entry.fromStatusId,
        toStatusId: entry.toStatusId,
        notes: entry.notes,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async updateItemStatus(userId: string, input: UpdateItemStatusInput) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        id: input.itemId,
        userId,
      },
      include: inventoryDetailInclude as any,
    });

    if (!existing) {
      throw new Error(`Inventory item ${input.itemId} not found.`);
    }

    const targetStatus = await this.resolveTargetStatus(userId, input);
    const soldDate =
      input.soldDate !== undefined
        ? this.toDate(String(input.soldDate))
        : input.stage === InventoryStage.SOLD
          ? new Date()
          : undefined;

    const updated = await this.prisma.inventoryItem.update({
      where: {
        id: input.itemId,
      },
      data: {
        stage: input.stage,
        statusId: targetStatus?.id ?? null,
        ...(input.listingPrice !== undefined ? { listingPrice: input.listingPrice } : {}),
        ...(input.soldPrice !== undefined ? { soldPrice: input.soldPrice } : {}),
        ...(soldDate !== undefined ? { soldDate } : {}),
      },
      include: inventoryDetailInclude as any,
    });

    const statusChanged = (existing as any).statusId !== (updated as any).statusId;
    const stageChanged = existing.stage !== updated.stage;

    if (statusChanged || stageChanged) {
      await this.recordHistory(userId, input.itemId, {
        fromStage: existing.stage,
        toStage: updated.stage,
        fromStatusId: (existing as any).statusId ?? undefined,
        toStatusId: (updated as any).statusId ?? undefined,
      });
    }

    return this.transformItem(updated);
  }

  async listActiveListings(userId: string, input: ListActiveListingsInput) {
    const where: any = {
      userId,
      stage: InventoryStage.LISTED,
    };

    if (input.statusSystemId) {
      where.status = {
        is: {
          userId,
          systemId: input.statusSystemId,
        },
      };
    }

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: inventoryListInclude as any,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: input.limit,
    });

    return {
      total: items.length,
      items: items.map((item: any) => this.transformItem(item)),
    };
  }

  async createInventoryItem(auth: AuthContext, input: CreateInventoryItemInput) {
    this.validateCreateInput(input);

    const statusId =
      input.statusId ??
      (await this.prisma.workflowStatus.findFirst({
        where: {
          userId: auth.userId,
          systemId: InventoryStage.ACQUIRED,
        },
      }))?.id ??
      (await this.prisma.workflowStatus.findFirst({
        where: {
          userId: auth.userId,
        },
        orderBy: {
          position: 'asc',
        },
      }))?.id ??
      null;

    const created = await this.prisma.inventoryItem.create({
      data: {
        userId: auth.userId,
        sellerId: auth.sellerId,
        itemType: input.itemType,
        cardVariantId: input.cardVariantId,
        refPriceChartingProductId: input.refPriceChartingProductId,
        productName: input.productName,
        productType: input.productType,
        language: input.language,
        setName: input.setName,
        setCode: input.setCode,
        cardNumber: input.cardNumber,
        edition: input.edition,
        integrity: input.integrity,
        configuration: input.configuration,
        gradeProvider: input.gradeProvider,
        gradeValue: input.gradeValue !== undefined ? String(input.gradeValue) : undefined,
        certNumber: input.certNumber,
        certificationNumber: input.certificationNumber ?? input.certNumber,
        gradingMeta: input.gradingMeta,
        gradingCost: input.gradingCost,
        slabImages: input.slabImages,
        condition: input.condition,
        quantity: input.quantity,
        sortOrder: input.sortOrder,
        stage: input.stage,
        statusId,
        listingPrice: input.listingPrice,
        soldPrice: input.soldPrice,
        soldDate: input.soldDate ? this.toDate(String(input.soldDate)) : null,
        acquisitionPrice: input.acquisitionPrice,
        acquisitionDate: input.acquisitionDate ? this.toDate(String(input.acquisitionDate)) : null,
        acquisitionSource: input.acquisitionSource,
        storageLocation: input.storageLocation,
        notes: input.notes,
        sellingDescription: input.sellingDescription,
        photos: input.photos,
        frontMediaId: input.frontMediaId,
        backMediaId: input.backMediaId,
      } as any,
      include: inventoryDetailInclude as any,
    });

    if (created.refPriceChartingProductId) {
      const marketPrice = this.getMarketPrice(created);
      if (marketPrice !== null) {
        await this.prisma.inventoryItem.update({
          where: {
            id: created.id,
          },
          data: {
            marketPriceSnapshot: marketPrice,
          },
        });
        (created as any).marketPriceSnapshot = marketPrice;
      }
    }

    return this.transformItem(created);
  }

  private transformItem(item: any) {
    let cardProfile: Record<string, unknown> | null = null;

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
        name: item.refPriceChartingProduct.title ?? 'Unknown',
        set: item.refPriceChartingProduct.set?.name ?? 'Unknown',
        setCode: item.refPriceChartingProduct.set?.code ?? item.setCode,
        rarity: '',
        cardNumber: item.refPriceChartingProduct.cardNumber ?? item.cardNumber ?? '',
        imageUrl: ensureCdnUrl(item.refPriceChartingProduct.imageUrl, this.env) ?? '',
        rawPrice: item.refPriceChartingProduct.rawPrice
          ? Number(item.refPriceChartingProduct.rawPrice)
          : null,
        sealedPrice: item.refPriceChartingProduct.sealedPrice
          ? Number(item.refPriceChartingProduct.sealedPrice)
          : null,
      };
    } else if (item.productName) {
      cardProfile = {
        id: null,
        name: item.productName,
        set: item.setName ?? 'Unknown',
        setCode: item.setCode ?? '',
        rarity: '',
        cardNumber: item.cardNumber ?? '',
        imageUrl:
          Array.isArray(item.photos) && item.photos.length > 0
            ? String(item.photos[0])
            : '',
      };
    }

    const base = {
      id: item.id,
      type: item.itemType,
      stage: item.stage,
      acquisitionPrice: item.acquisitionPrice ? Number(item.acquisitionPrice) : null,
      listingPrice: item.listingPrice ? Number(item.listingPrice) : null,
      soldPrice: item.soldPrice ? Number(item.soldPrice) : null,
      soldDate: item.soldDate?.toISOString?.() ?? null,
      marketPriceSnapshot: item.marketPriceSnapshot ? Number(item.marketPriceSnapshot) : null,
      marketPrice: item.marketPriceSnapshot ? Number(item.marketPriceSnapshot) : null,
      acquisitionDate: item.acquisitionDate?.toISOString?.() ?? null,
      acquisitionSource: item.acquisitionSource ?? null,
      storageLocation: item.storageLocation ?? null,
      notes: item.notes ?? null,
      sellingDescription: item.sellingDescription ?? null,
      photos: Array.isArray(item.photos) ? item.photos : [],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      quantity: item.quantity,
      sortOrder: item.sortOrder,
      statusId: item.statusId ?? null,
      status: item.status
        ? {
            id: item.status.id,
            name: item.status.name,
            color: item.status.color,
            position: item.status.position,
            systemId: item.status.systemId,
            isEnabled: item.status.isEnabled,
            showOnKanban: item.status.showOnKanban,
          }
        : null,
      frontMediaId: item.frontMediaId ?? null,
      backMediaId: item.backMediaId ?? null,
      frontMediaUrl: buildMediaUrl(item.frontMedia, this.env),
      backMediaUrl: buildMediaUrl(item.backMedia, this.env),
      cardProfile,
    };

    if (item.itemType === ItemType.SINGLE_CARD_RAW) {
      return {
        ...base,
        cardVariantId: item.cardVariantId ?? null,
        refPriceChartingProductId: item.refPriceChartingProductId ?? null,
        condition: item.condition ?? null,
      };
    }

    if (item.itemType === ItemType.SINGLE_CARD_GRADED) {
      return {
        ...base,
        cardVariantId: item.cardVariantId ?? null,
        refPriceChartingProductId: item.refPriceChartingProductId ?? null,
        gradeProvider: item.gradeProvider ?? null,
        gradeValue: item.gradeValue ?? null,
        certNumber: item.certNumber ?? null,
        gradingCost: item.gradingCost ? Number(item.gradingCost) : null,
        slabImages: item.slabImages ?? {},
        gradingMeta: item.gradingMeta ?? {},
        previousCertNumbers: item.previousCertNumbers ?? [],
      };
    }

    if (item.itemType === ItemType.SEALED_PRODUCT) {
      return {
        ...base,
        productName: item.productName ?? null,
        productType: item.productType ?? null,
        language: item.language ?? null,
        setName: item.setName ?? null,
        edition: item.edition ?? null,
        integrity: item.integrity ?? null,
        configuration: item.configuration ?? {},
      };
    }

    return base;
  }

  private getMarketPrice(item: any): number | null {
    const ref = item.refPriceChartingProduct;
    if (!ref) {
      return null;
    }

    const cacheKey = `${ref.id}:${item.itemType}:${item.gradeProvider ?? ''}:${item.gradeValue ?? ''}`;
    const cached = this.marketPriceCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const sales = Array.isArray(ref.sales) ? ref.sales : [];
    const averageOfThree = (rows: any[]): number | null => {
      if (rows.length === 0) {
        return null;
      }

      const recentRows = rows.slice(0, 3);
      const total = recentRows.reduce((sum, row) => sum + Number(row.price), 0);
      return Number((total / recentRows.length).toFixed(2));
    };

    if (item.itemType === ItemType.SEALED_PRODUCT) {
      const price = ref.sealedPrice ? Number(ref.sealedPrice) : null;
      this.marketPriceCache.set(cacheKey, price);
      return price;
    }

    if (item.itemType === ItemType.SINGLE_CARD_GRADED) {
      const gradeValue = String(item.gradeValue ?? '');
      const gradeKey = gradeValue === '9.5' ? 'grade95Price' : `grade${gradeValue.replace('.', '')}Price`;
      const gradedSales = sales.filter((sale: any) => String(sale.grade ?? '').includes(gradeValue));
      const gradedAverage = averageOfThree(gradedSales);
      const fallbackPrice = ref[gradeKey] ? Number(ref[gradeKey]) : null;
      const price = gradedAverage ?? fallbackPrice;
      this.marketPriceCache.set(cacheKey, price);
      return price;
    }

    if (item.itemType === ItemType.SINGLE_CARD_RAW) {
      const rawSales = sales.filter((sale: any) => {
        const grade = String(sale.grade ?? '').toLowerCase();
        return !grade || grade.includes('raw') || grade.includes('ungraded');
      });
      const rawAverage = averageOfThree(rawSales);
      const price = rawAverage ?? (ref.rawPrice ? Number(ref.rawPrice) : null);
      this.marketPriceCache.set(cacheKey, price);
      return price;
    }

    this.marketPriceCache.set(cacheKey, null);
    return null;
  }

  private validateCreateInput(input: CreateInventoryItemInput) {
    if (input.itemType === ItemType.SINGLE_CARD_RAW) {
      if (!input.cardVariantId && !input.refPriceChartingProductId && !input.productName) {
        throw new Error(
          'cardVariantId, refPriceChartingProductId, or productName is required for SINGLE_CARD_RAW.',
        );
      }
      return;
    }

    if (input.itemType === ItemType.SINGLE_CARD_GRADED) {
      if (!input.cardVariantId && !input.refPriceChartingProductId && !input.productName) {
        throw new Error(
          'cardVariantId, refPriceChartingProductId, or productName is required for SINGLE_CARD_GRADED.',
        );
      }

      if (!input.gradeProvider || input.gradeValue === undefined) {
        throw new Error('gradeProvider and gradeValue are required for SINGLE_CARD_GRADED.');
      }
      return;
    }

    if (input.itemType === ItemType.SEALED_PRODUCT) {
      if (!input.productName || !input.productType) {
        throw new Error('productName and productType are required for SEALED_PRODUCT.');
      }
    }
  }

  private async resolveTargetStatus(
    userId: string,
    input: UpdateItemStatusInput,
  ): Promise<{ id: string } | null> {
    let selectedById: { id: string } | null = null;
    let selectedBySystemId: { id: string } | null = null;

    if (input.statusId) {
      selectedById = await this.prisma.workflowStatus.findFirst({
        where: {
          id: input.statusId,
          userId,
        },
      });

      if (!selectedById) {
        throw new Error(`Workflow status ${input.statusId} does not belong to the active user.`);
      }
    }

    if (input.statusSystemId) {
      selectedBySystemId = await this.prisma.workflowStatus.findFirst({
        where: {
          userId,
          systemId: input.statusSystemId,
        },
      });

      if (!selectedBySystemId) {
        throw new Error(`No workflow status found for systemId ${input.statusSystemId}.`);
      }
    }

    if (selectedById && selectedBySystemId && selectedById.id !== selectedBySystemId.id) {
      throw new Error('statusId and statusSystemId resolve to different workflow statuses.');
    }

    if (selectedById) {
      return selectedById;
    }

    if (selectedBySystemId) {
      return selectedBySystemId;
    }

    return this.prisma.workflowStatus.findFirst({
      where: {
        userId,
        systemId: input.stage,
      },
    });
  }

  private async recordHistory(
    userId: string,
    itemId: string,
    input: {
      fromStage?: InventoryStage;
      toStage?: InventoryStage;
      fromStatusId?: string;
      toStatusId?: string;
    },
  ) {
    await this.prisma.inventoryHistory.create({
      data: {
        itemId,
        userId,
        type: 'TRANSITION',
        fromStage: input.fromStage ?? null,
        toStage: input.toStage ?? null,
        fromStatusId: input.fromStatusId ?? null,
        toStatusId: input.toStatusId ?? null,
      },
    });
  }

  private toDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return parsed;
  }
}
