import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AbuseReportReason, AbuseReportTarget, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, AbuseReportTargetDto } from './dto/create-report.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class ModerationService {
    constructor(private readonly prisma: PrismaService) { }

    async createReport(reporterId: string, dto: CreateReportDto) {
        // Validate target exists. We don't leak whether the target ID is "real" beyond a boolean.
        if (dto.targetType === AbuseReportTargetDto.VENDOR) {
            const vendor = await this.prisma.sellerProfile.findFirst({
                where: {
                    OR: [{ handle: dto.targetId }, { id: dto.targetId }],
                },
                select: { id: true, userId: true },
            });
            if (!vendor) {throw new NotFoundException('Vendor not found');}
            // Self-reports are useless; reject quietly
            if (vendor.userId && vendor.userId === reporterId) {
                throw new BadRequestException('Cannot report your own storefront');
            }
        } else if (dto.targetType === AbuseReportTargetDto.ITEM) {
            const item = await this.prisma.inventoryItem.findUnique({
                where: { id: dto.targetId },
                select: { id: true, userId: true },
            });
            if (!item) {throw new NotFoundException('Item not found');}
            if (item.userId && item.userId === reporterId) {
                throw new BadRequestException('Cannot report your own item');
            }
        }

        const report = await this.prisma.abuseReport.create({
            data: {
                reporterId,
                targetType: dto.targetType as AbuseReportTarget,
                targetId: dto.targetId,
                reason: dto.reason as AbuseReportReason,
                details: dto.details ?? null,
            },
            select: { id: true, createdAt: true },
        });

        return { id: report.id, createdAt: report.createdAt.toISOString() };
    }

    async createBlock(blockerId: string, dto: CreateBlockDto) {
        const blockedUserId = await this.resolveTargetUserId(dto);
        if (!blockedUserId) {
            throw new BadRequestException('Provide userId or handle');
        }
        if (blockedUserId === blockerId) {
            throw new BadRequestException('Cannot block yourself');
        }

        try {
            await this.prisma.userBlock.create({
                data: { blockerId, blockedUserId },
            });
        } catch (e: unknown) {
            // Prisma P2002 = unique constraint violation (already blocked)
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('User is already blocked');
            }
            throw e;
        }

        return { success: true };
    }

    async removeBlock(blockerId: string, targetUserId: string) {
        const result = await this.prisma.userBlock.deleteMany({
            where: { blockerId, blockedUserId: targetUserId },
        });
        if (result.count === 0) {
            throw new NotFoundException('Block not found');
        }
        return { success: true };
    }

    async listBlocks(blockerId: string) {
        const blocks = await this.prisma.userBlock.findMany({
            where: { blockerId },
            orderBy: { createdAt: 'desc' },
            include: {
                blockedUser: {
                    select: {
                        id: true,
                        email: true,
                        sellerProfile: {
                            select: { handle: true, shopName: true },
                        },
                    },
                },
            },
        });

        return blocks.map(b => ({
            id: b.id,
            userId: b.blockedUserId,
            handle: b.blockedUser.sellerProfile?.handle ?? null,
            shopName: b.blockedUser.sellerProfile?.shopName ?? null,
            createdAt: b.createdAt.toISOString(),
        }));
    }

    /**
     * Returns the set of user IDs blocked by `userId`, for use in content-filtering queries.
     * Returns an empty array for unauthenticated callers.
     */
    async getBlockedUserIds(userId: string | undefined): Promise<string[]> {
        if (!userId) {return [];}
        const rows = await this.prisma.userBlock.findMany({
            where: { blockerId: userId },
            select: { blockedUserId: true },
        });
        return rows.map(r => r.blockedUserId);
    }

    private async resolveTargetUserId(dto: CreateBlockDto): Promise<string | null> {
        if (dto.userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: dto.userId },
                select: { id: true },
            });
            return user?.id ?? null;
        }
        if (dto.handle) {
            const seller = await this.prisma.sellerProfile.findUnique({
                where: { handle: dto.handle },
                select: { userId: true },
            });
            return seller?.userId ?? null;
        }
        return null;
    }
}
