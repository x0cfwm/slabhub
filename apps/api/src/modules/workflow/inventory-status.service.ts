import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryStatusDto, UpdateInventoryStatusDto, ReorderInventoryStatusDto } from './dto/inventory-status.dto';

@Injectable()
export class InventoryStatusService {
    constructor(private readonly prisma: PrismaService) { }

    async listStatuses(userId: string) {
        let statuses = await this.prisma.inventoryStatus.findMany({
            where: { userId },
            orderBy: { position: 'asc' },
        });

        // Seed default statuses if none exist for the user
        if (statuses.length === 0) {
            statuses = await this.seedDefaultStatuses(userId);
        }

        return statuses;
    }

    async createStatus(userId: string, dto: CreateInventoryStatusDto) {
        // If position is not provided, put it at the end
        let position = dto.position;
        if (position === undefined) {
            const lastStatus = await this.prisma.inventoryStatus.findFirst({
                where: { userId },
                orderBy: { position: 'desc' },
            });
            position = lastStatus ? lastStatus.position + 1 : 0;
        }

        return this.prisma.inventoryStatus.create({
            data: {
                ...dto,
                position,
                userId,
            },
        });
    }

    async updateStatus(userId: string, id: string, dto: UpdateInventoryStatusDto) {
        const existing = await this.prisma.inventoryStatus.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            throw new NotFoundException(`Status ${id} not found`);
        }

        return this.prisma.inventoryStatus.update({
            where: { id },
            data: dto,
        });
    }

    async reorderStatuses(userId: string, items: ReorderInventoryStatusDto[]) {
        return await this.prisma.$transaction(
            items.map((item) =>
                this.prisma.inventoryStatus.updateMany({
                    where: { id: item.id, userId },
                    data: { position: item.position },
                }),
            ),
        );
    }

    async deleteStatus(userId: string, id: string, moveItemsToStatusId?: string) {
        const existing = await this.prisma.inventoryStatus.findFirst({
            where: { id, userId },
            include: { _count: { select: { items: true } } },
        });

        if (!existing) {
            throw new NotFoundException(`Status ${id} not found`);
        }

        if (existing._count.items > 0) {
            if (!moveItemsToStatusId) {
                throw new BadRequestException('Cannot delete status with items. Please provide a replacement status ID.');
            }

            const targetStatus = await this.prisma.inventoryStatus.findFirst({
                where: { id: moveItemsToStatusId, userId },
            });

            if (!targetStatus) {
                throw new BadRequestException('Target status for moving items not found.');
            }

            // Move items in a transaction
            await this.prisma.$transaction([
                this.prisma.inventoryItem.updateMany({
                    where: { statusId: id, userId },
                    data: { statusId: moveItemsToStatusId },
                }),
                this.prisma.inventoryStatus.delete({
                    where: { id },
                }),
            ]);
        } else {
            await this.prisma.inventoryStatus.delete({
                where: { id },
            });
        }

        return { success: true };
    }

    private async seedDefaultStatuses(userId: string) {
        const defaults = [
            { name: 'Acquired', position: 0, color: '#94a3b8' },
            { name: 'In Transit', position: 1, color: '#f59e0b' },
            { name: 'Grading', position: 2, color: '#8b5cf6' },
            { name: 'In Stock', position: 3, color: '#10b981' },
            { name: 'Listed', position: 4, color: '#3b82f6' },
            { name: 'Sold', position: 5, color: '#ef4444' },
        ];

        await this.prisma.inventoryStatus.createMany({
            data: defaults.map(d => ({ ...d, userId })),
        });

        return this.prisma.inventoryStatus.findMany({
            where: { userId },
            orderBy: { position: 'asc' },
        });
    }
}
