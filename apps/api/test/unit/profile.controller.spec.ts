import { NotFoundException } from '@nestjs/common';
import { ProfileController } from '../../src/modules/profile/profile.controller';

describe('ProfileController', () => {
  let service: any;
  let controller: ProfileController;

  beforeEach(() => {
    service = {
      getProfileByUserId: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
    };
    controller = new ProfileController(service);
  });

  it('prefers userId for getProfile', async () => {
    service.getProfileByUserId.mockResolvedValue({ id: 'u1' });
    await expect(controller.getProfile('u1', 's1')).resolves.toEqual({ id: 'u1' });
  });

  it('uses sellerId when userId missing', async () => {
    service.getProfile.mockResolvedValue({ id: 's1' });
    await expect(controller.getProfile(undefined, 's1')).resolves.toEqual({ id: 's1' });
  });

  it('throws when both user and seller are missing', async () => {
    await expect(controller.getProfile(undefined, undefined)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires user for update and delete', async () => {
    await expect(controller.updateProfile(undefined, {} as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.deleteAccount(undefined)).rejects.toBeInstanceOf(NotFoundException);
  });
});
