import { NotFoundException } from '@nestjs/common';
import { WorkflowStatusController } from '../../src/modules/workflow/workflow-status.controller';

describe('WorkflowStatusController', () => {
  let service: any;
  let controller: WorkflowStatusController;

  beforeEach(() => {
    service = {
      listStatuses: jest.fn().mockResolvedValue([]),
      seedStatuses: jest.fn().mockResolvedValue([]),
      createStatus: jest.fn().mockResolvedValue({ id: '1' }),
      reorderStatuses: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({ id: '1' }),
      deleteStatus: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new WorkflowStatusController(service);
  });

  it('throws when user missing for protected actions', async () => {
    await expect(controller.listStatuses(undefined, undefined)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.seedStatuses(undefined)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.createStatus(undefined, {} as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.reorderStatuses(undefined, [] as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.updateStatus(undefined, 'id', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.deleteStatus(undefined, 'id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates when user present', async () => {
    await expect(controller.listStatuses('u1', 'true')).resolves.toEqual([]);
    expect(service.listStatuses).toHaveBeenCalledWith('u1', true);
  });
});
