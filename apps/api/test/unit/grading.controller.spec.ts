import { BadRequestException } from '@nestjs/common';
import { GradingController } from '../../src/modules/grading/grading.controller';

describe('GradingController', () => {
  let controller: GradingController;
  let gradingService: any;
  let recognitionService: any;
  let prisma: any;

  beforeEach(() => {
    gradingService = { lookup: jest.fn().mockResolvedValue({ success: true }) };
    recognitionService = { recognizeFromImage: jest.fn().mockResolvedValue({ success: true }) };
    prisma = { media: { findUnique: jest.fn() } };

    controller = new GradingController(gradingService, recognitionService, {} as any, prisma as any);
  });

  it('delegates lookup', async () => {
    await expect(controller.lookup({ grader: 'PSA', certNumber: '1' } as any)).resolves.toEqual({ success: true });
  });

  it('recognizes with uploaded file', async () => {
    const file = { buffer: Buffer.from('abc'), mimetype: 'image/jpeg' } as any;
    await expect(controller.recognize(file, undefined)).resolves.toEqual({ success: true });
  });

  it('throws if mediaId does not exist', async () => {
    prisma.media.findUnique.mockResolvedValue(null);
    await expect(controller.recognize(undefined as any, 'm1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when neither file nor mediaId is provided', async () => {
    await expect(controller.recognize(undefined as any, undefined)).rejects.toBeInstanceOf(BadRequestException);
  });
});
