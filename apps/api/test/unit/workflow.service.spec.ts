import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowStatusService } from '../../src/modules/workflow/workflow-status.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('WorkflowStatusService', () => {
  let prisma: any;
  let service: WorkflowStatusService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WorkflowStatusService(prisma);
  });

  it('seeds defaults when no statuses exist', async () => {
    prisma.workflowStatus.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 's1', name: 'Acquired' }]);
    prisma.workflowStatus.count.mockResolvedValue(0);
    prisma.workflowStatus.findFirst.mockResolvedValue(null);
    prisma.workflowStatus.create.mockResolvedValue({});

    const out = await service.listStatuses('u1', false);
    expect(out).toEqual([{ id: 's1', name: 'Acquired' }]);
    expect(prisma.workflowStatus.create).toHaveBeenCalled();
  });

  it('computes default position on create', async () => {
    prisma.workflowStatus.findFirst.mockResolvedValue({ position: 7 });
    prisma.workflowStatus.create.mockResolvedValue({ id: 's1', position: 8 });

    const out = await service.createStatus('u1', { name: 'X' } as any);
    expect(out.position).toBe(8);
  });

  it('throws when updating missing status', async () => {
    prisma.workflowStatus.findFirst.mockResolvedValue(null);
    await expect(service.updateStatus('u1', 'id1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deleteStatus prevents deleting system status', async () => {
    prisma.workflowStatus.findFirst.mockResolvedValue({ id: 's1', systemId: 'ACQUIRED', _count: { items: 0 } });
    await expect(service.deleteStatus('u1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteStatus requires replacement when items exist', async () => {
    prisma.workflowStatus.findFirst.mockResolvedValue({ id: 's1', systemId: null, _count: { items: 2 } });
    await expect(service.deleteStatus('u1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
