import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ModerationService } from '../../src/modules/moderation/moderation.service';
import {
  AbuseReportReasonDto,
  AbuseReportTargetDto,
  CreateReportDto,
} from '../../src/modules/moderation/dto/create-report.dto';
import { CreateBlockDto } from '../../src/modules/moderation/dto/create-block.dto';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('ModerationService', () => {
  describe('createReport', () => {
    it('records a VENDOR report after verifying the seller exists', async () => {
      const prisma = createPrismaMock();
      prisma.sellerProfile.findFirst.mockResolvedValue({ id: 's1', userId: 'u-other' });
      prisma.abuseReport.create.mockResolvedValue({ id: 'r1', createdAt: new Date('2025-01-01') });

      const service = new ModerationService(prisma);
      const dto: CreateReportDto = {
        targetType: AbuseReportTargetDto.VENDOR,
        targetId: 'nami-treasures',
        reason: AbuseReportReasonDto.SPAM,
        details: 'Too many listings',
      };

      const res = await service.createReport('u1', dto);
      expect(res).toEqual({ id: 'r1', createdAt: '2025-01-01T00:00:00.000Z' });
      expect(prisma.abuseReport.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          reporterId: 'u1',
          targetType: 'VENDOR',
          targetId: 'nami-treasures',
          reason: 'SPAM',
          details: 'Too many listings',
        }),
      }));
    });

    it('404s when the vendor does not exist', async () => {
      const prisma = createPrismaMock();
      prisma.sellerProfile.findFirst.mockResolvedValue(null);
      const service = new ModerationService(prisma);

      await expect(service.createReport('u1', {
        targetType: AbuseReportTargetDto.VENDOR,
        targetId: 'missing',
        reason: AbuseReportReasonDto.SPAM,
      })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects self-reports on vendors', async () => {
      const prisma = createPrismaMock();
      prisma.sellerProfile.findFirst.mockResolvedValue({ id: 's1', userId: 'u1' });
      const service = new ModerationService(prisma);

      await expect(service.createReport('u1', {
        targetType: AbuseReportTargetDto.VENDOR,
        targetId: 'my-handle',
        reason: AbuseReportReasonDto.SPAM,
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s when the item does not exist', async () => {
      const prisma = createPrismaMock();
      prisma.inventoryItem.findUnique = jest.fn().mockResolvedValue(null);
      const service = new ModerationService(prisma);

      await expect(service.createReport('u1', {
        targetType: AbuseReportTargetDto.ITEM,
        targetId: 'missing',
        reason: AbuseReportReasonDto.SCAM,
      })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects self-reports on items', async () => {
      const prisma = createPrismaMock();
      prisma.inventoryItem.findUnique = jest.fn().mockResolvedValue({ id: 'i1', userId: 'u1' });
      const service = new ModerationService(prisma);

      await expect(service.createReport('u1', {
        targetType: AbuseReportTargetDto.ITEM,
        targetId: 'i1',
        reason: AbuseReportReasonDto.SCAM,
      })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createBlock', () => {
    it('resolves a handle and creates the block', async () => {
      const prisma = createPrismaMock();
      prisma.sellerProfile.findUnique.mockResolvedValue({ userId: 'u-target' });
      prisma.userBlock.create.mockResolvedValue({ id: 'b1' });
      const service = new ModerationService(prisma);

      const dto: CreateBlockDto = { handle: 'bad-actor' };
      await expect(service.createBlock('u1', dto)).resolves.toEqual({ success: true });
      expect(prisma.userBlock.create).toHaveBeenCalledWith({
        data: { blockerId: 'u1', blockedUserId: 'u-target' },
      });
    });

    it('rejects self-blocks', async () => {
      const prisma = createPrismaMock();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      const service = new ModerationService(prisma);

      await expect(service.createBlock('u1', { userId: 'u1' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('400s when neither userId nor handle resolves', async () => {
      const prisma = createPrismaMock();
      const service = new ModerationService(prisma);
      await expect(service.createBlock('u1', {})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('translates Prisma P2002 into a ConflictException', async () => {
      const prisma = createPrismaMock();
      prisma.user.findUnique.mockResolvedValue({ id: 'u-target' });
      const err: any = new Error('unique');
      err.code = 'P2002';
      // Mimic a PrismaClientKnownRequestError so the instanceof check passes.
      const { Prisma } = jest.requireActual('@prisma/client');
      const p2002 = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.userBlock.create.mockRejectedValue(p2002);

      const service = new ModerationService(prisma);
      await expect(service.createBlock('u1', { userId: 'u-target' }))
        .rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('removeBlock', () => {
    it('404s when nothing was deleted', async () => {
      const prisma = createPrismaMock();
      prisma.userBlock.deleteMany.mockResolvedValue({ count: 0 });
      const service = new ModerationService(prisma);
      await expect(service.removeBlock('u1', 'u2')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns success when a block is removed', async () => {
      const prisma = createPrismaMock();
      prisma.userBlock.deleteMany.mockResolvedValue({ count: 1 });
      const service = new ModerationService(prisma);
      await expect(service.removeBlock('u1', 'u2')).resolves.toEqual({ success: true });
    });
  });

  describe('getBlockedUserIds', () => {
    it('returns [] for unauthenticated callers without hitting the DB', async () => {
      const prisma = createPrismaMock();
      const service = new ModerationService(prisma);
      await expect(service.getBlockedUserIds(undefined)).resolves.toEqual([]);
      expect(prisma.userBlock.findMany).not.toHaveBeenCalled();
    });

    it('returns the list of blocked user ids for an authenticated caller', async () => {
      const prisma = createPrismaMock();
      prisma.userBlock.findMany.mockResolvedValue([
        { blockedUserId: 'u-a' },
        { blockedUserId: 'u-b' },
      ]);
      const service = new ModerationService(prisma);
      await expect(service.getBlockedUserIds('u1')).resolves.toEqual(['u-a', 'u-b']);
    });
  });

  describe('listBlocks', () => {
    it('maps blocks with their seller profile data', async () => {
      const prisma = createPrismaMock();
      prisma.userBlock.findMany.mockResolvedValue([
        {
          id: 'b1',
          blockedUserId: 'u-a',
          createdAt: new Date('2025-01-01'),
          blockedUser: {
            id: 'u-a',
            email: 'a@example.com',
            sellerProfile: { handle: 'bad-actor', shopName: 'Bad Shop' },
          },
        },
      ]);
      const service = new ModerationService(prisma);
      await expect(service.listBlocks('u1')).resolves.toEqual([
        {
          id: 'b1',
          userId: 'u-a',
          handle: 'bad-actor',
          shopName: 'Bad Shop',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ]);
    });
  });
});
