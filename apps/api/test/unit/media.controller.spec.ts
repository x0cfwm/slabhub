import { BadRequestException } from '@nestjs/common';
import { MediaController } from '../../src/modules/media/media.controller';

describe('MediaController', () => {
  it('throws when no file uploaded', async () => {
    const service = { putBuffer: jest.fn(), getPublicUrl: jest.fn() };
    const controller = new MediaController(service as any);

    await expect(controller.uploadFile(undefined as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads file and returns response payload', async () => {
    const service = {
      putBuffer: jest.fn().mockResolvedValue({
        id: 'm1',
        hash: 'h1',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
      }),
      getPublicUrl: jest.fn().mockReturnValue('https://cdn.test/m1.jpg'),
    };
    const controller = new MediaController(service as any);

    const file = {
      buffer: Buffer.from('abc'),
      mimetype: 'image/jpeg',
      originalname: 'x.jpg',
    } as any;

    await expect(controller.uploadFile(file)).resolves.toEqual({
      mediaId: 'm1',
      url: 'https://cdn.test/m1.jpg',
      hash: 'h1',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
    });
  });
});
