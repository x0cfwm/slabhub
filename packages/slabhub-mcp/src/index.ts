#!/usr/bin/env node

import {
  Condition,
  GradeProvider,
  InventoryStage,
  ItemType,
  PrismaClient,
  ProductType,
  SealedIntegrity,
} from '@prisma/client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadEnv } from './env.js';
import { resolveSessionContext } from './auth.js';
import {
  SlabhubInventoryService,
  createInventoryItemSchema,
  getItemDetailsSchema,
  listActiveListingsSchema,
  searchInventorySchema,
  updateItemStatusSchema,
} from './inventory.js';
import { SlabhubAnalyticsService } from './analytics.js';

const analyticsSummarySchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
});

function jsonContent(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

async function main() {
  const env = loadEnv();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

  await prisma.$connect();

  try {
    const auth = await resolveSessionContext(prisma, env.SLABHUB_MCP_SESSION_TOKEN);
    const inventory = new SlabhubInventoryService(prisma, env);
    const analytics = new SlabhubAnalyticsService(prisma);

    const server = new McpServer({
      name: 'slabhub-mcp',
      version: '1.0.0',
    });

    server.tool(
      'search_inventory',
      'Search the authenticated user inventory by item name, set, grade or workflow state.',
      {
        query: z.string().trim().min(1).optional(),
        stage: z.nativeEnum(InventoryStage).optional(),
        statusSystemId: z.string().trim().min(1).optional(),
        itemType: z.nativeEnum(ItemType).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      },
      async (input) => jsonContent(await inventory.searchInventory(auth.userId, searchInventorySchema.parse(input))),
    );

    server.tool(
      'get_item_details',
      'Return a full normalized inventory item record, linked product pricing context, and recent history.',
      {
        itemId: z.string().trim().min(1),
      },
      async (input) => jsonContent(await inventory.getItemDetails(auth.userId, getItemDetailsSchema.parse(input))),
    );

    server.tool(
      'update_item_status',
      'Update stage-driven item state, align workflow status, and optionally persist listing or sold pricing.',
      {
        itemId: z.string().trim().min(1),
        stage: z.nativeEnum(InventoryStage),
        listingPrice: z.number().min(0).optional(),
        soldPrice: z.number().min(0).optional(),
        soldDate: z.string().trim().min(1).optional(),
        statusId: z.string().trim().min(1).optional(),
        statusSystemId: z.string().trim().min(1).optional(),
      },
      async (input) => jsonContent(await inventory.updateItemStatus(auth.userId, updateItemStatusSchema.parse(input))),
    );

    server.tool(
      'get_analytics_summary',
      'Return dashboard-style seller analytics for the authenticated user over the requested day window.',
      {
        days: z.number().int().min(1).max(365).default(7),
      },
      async (input) =>
        jsonContent(await analytics.getAnalyticsSummary(auth.userId, analyticsSummarySchema.parse(input).days)),
    );

    server.tool(
      'list_active_listings',
      'List LISTED inventory items for the authenticated user, ordered like the public shop listing view.',
      {
        limit: z.number().int().min(1).max(100).default(50),
        statusSystemId: z.string().trim().min(1).optional(),
      },
      async (input) =>
        jsonContent(await inventory.listActiveListings(auth.userId, listActiveListingsSchema.parse(input))),
    );

    server.tool(
      'create_inventory_item',
      'Quick add a new inventory item for the authenticated user, using the same validation rules as the API.',
      {
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
      },
      async (input) => jsonContent(await inventory.createInventoryItem(auth, createInventoryItemSchema.parse(input))),
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);

    const shutdown = async (code = 0) => {
      await prisma.$disconnect();
      process.exit(code);
    };

    process.once('SIGINT', () => {
      void shutdown(0);
    });
    process.once('SIGTERM', () => {
      void shutdown(0);
    });
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}

main().catch((error) => {
  console.error('[slabhub-mcp] failed to start');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
