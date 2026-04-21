export function createPrismaMock() {
  return {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return arg(createPrismaMock());
      }
      return arg;
    }),

    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    otpChallenge: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    invite: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inviteAcceptance: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    sellerProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    oAuthIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    inventoryHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workflowStatus: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    cardProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    cardVariant: {
      findMany: jest.fn(),
    },
    pricingSnapshot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    media: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    refSyncProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    refPriceChartingProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    refPriceChartingSet: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    refProduct: {
      updateMany: jest.fn(),
    },
    refGame: {
      upsert: jest.fn(),
    },
    refSet: {
      upsert: jest.fn(),
    },
    priceChartingSales: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
    shopEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    waitlistParticipant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    gradingRecognitionTrace: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  } as any;
}
