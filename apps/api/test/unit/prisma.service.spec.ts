import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('PrismaService lifecycle', () => {
  it('connects and disconnects on module lifecycle hooks', async () => {
    const service = new PrismaService();

    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined as never);
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connectSpy).toHaveBeenCalled();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
