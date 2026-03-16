import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowStatusDto, UpdateWorkflowStatusDto, ReorderWorkflowStatusDto } from './dto/workflow-status.dto';

@Injectable()
export class WorkflowStatusService {
    constructor(private readonly prisma: PrismaService) { }

    async listStatuses(userId: string, includeDisabled = false) {
        const where = includeDisabled ? { userId } : { userId, isEnabled: true };
        let statuses = await this.prisma.workflowStatus.findMany({
            where,
            orderBy: { position: 'asc' },
            include: { _count: { select: { items: true } } },
        });

        // Seed default statuses if none exist for the user
        if (statuses.length === 0) {
            // Check if user has ANY statuses (even disabled system ones)
            const count = await this.prisma.workflowStatus.count({ where: { userId } });
            if (count === 0) {
                statuses = await this.seedDefaultStatuses(userId);
            } else {
                statuses = await this.prisma.workflowStatus.findMany({
                    where: { userId, isEnabled: true },
                    orderBy: { position: 'asc' },
                    include: { _count: { select: { items: true } } },
                });
            }
        }

        return statuses;
    }

    async createStatus(userId: string, dto: CreateWorkflowStatusDto) {
        // If position is not provided, put it at the end
        let position = dto.position;
        if (position === undefined) {
            const lastStatus = await this.prisma.workflowStatus.findFirst({
                where: { userId },
                orderBy: { position: 'desc' },
            });
            position = lastStatus ? lastStatus.position + 1 : 0;
        }

        return this.prisma.workflowStatus.create({
            data: {
                ...dto,
                position,
                userId,
            },
        });
    }

    async updateStatus(userId: string, id: string, dto: UpdateWorkflowStatusDto) {
        const existing = await this.prisma.workflowStatus.findFirst({
            where: { id, userId },
        });

        if (!existing) {
            throw new NotFoundException(`Status ${id} not found`);
        }

        return this.prisma.workflowStatus.update({
            where: { id },
            data: dto,
        });
    }

    async reorderStatuses(userId: string, items: ReorderWorkflowStatusDto[]) {
        return await this.prisma.$transaction(
            items.map((item) =>
                this.prisma.workflowStatus.updateMany({
                    where: { id: item.id, userId },
                    data: { position: item.position },
                }),
            ),
        );
    }

    async deleteStatus(userId: string, id: string, moveItemsToStatusId?: string) {
        const existing = await this.prisma.workflowStatus.findFirst({
            where: { id, userId },
            include: { _count: { select: { items: true } } },
        });

        if (!existing) {
            throw new NotFoundException(`Status ${id} not found`);
        }

        if (existing.systemId) {
            throw new BadRequestException('System statuses cannot be deleted. They can only be disabled.');
        }

        if (existing._count.items > 0) {
            if (!moveItemsToStatusId) {
                throw new BadRequestException('Cannot delete status with items. Please provide a replacement status ID.');
            }

            const targetStatus = await this.prisma.workflowStatus.findFirst({
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
                this.prisma.workflowStatus.delete({
                    where: { id },
                }),
            ]);
        } else {
            await this.prisma.workflowStatus.delete({
                where: { id },
            });
        }

        return { success: true };
    }

    async seedStatuses(userId: string) {
        return this.seedDefaultStatuses(userId);
    }

    private async seedDefaultStatuses(userId: string) {
        const defaults = [
            { name: 'Acquired', position: 0, color: '#94a3b8', systemId: 'ACQUIRED', showOnKanban: true },
            { name: 'In Transit', position: 1, color: '#f59e0b', systemId: 'IN_TRANSIT', showOnKanban: true },
            { name: 'Grading', position: 2, color: '#8b5cf6', systemId: 'BEING_GRADED', showOnKanban: true },
            { name: 'In Stock', position: 3, color: '#10b981', systemId: 'IN_STOCK', showOnKanban: true },
            { name: 'Listed', position: 4, color: '#3b82f6', systemId: 'LISTED', showOnKanban: true },
            { name: 'Sold', position: 5, color: '#ef4444', systemId: 'SOLD', showOnKanban: true },
        ];

        // Use findFirst and create if not exists for seeding
        for (const status of defaults) {
            const existing = await this.prisma.workflowStatus.findFirst({
                where: { userId, systemId: status.systemId },
            });
            if (!existing) {
                await this.prisma.workflowStatus.create({
                    data: { ...status, userId },
                });
            }
        }

        return this.prisma.workflowStatus.findMany({
            where: { userId, isEnabled: true },
            orderBy: { position: 'asc' },
            include: { _count: { select: { items: true } } },
        });
    }
}
