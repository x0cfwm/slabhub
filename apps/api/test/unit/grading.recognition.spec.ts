import { BadRequestException } from '@nestjs/common';
import { GradingRecognitionService } from '../../src/modules/grading/grading-recognition.service';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('GradingRecognitionService', () => {
  it('throws when GEMINI_API_KEY is missing', async () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const service = new GradingRecognitionService(configService as any, createPrismaMock());

    await expect(service.recognizeFromImage(Buffer.from('x'), 'image/jpeg')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns parsed AI response when model succeeds', async () => {
    const configService = { get: jest.fn().mockReturnValue('key') };
    const prisma = createPrismaMock();
    prisma.refPriceChartingSet.findFirst.mockResolvedValue(null);

    const service = new GradingRecognitionService(configService as any, prisma);

    (service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                success: true,
                data: {
                  grader: 'PSA',
                  certNumber: '123',
                  gradeValue: '10',
                  cardName: 'Luffy',
                  setName: 'Set',
                  setCode: 'OP01',
                  cardNumber: '1',
                },
              }),
          },
        }),
      }),
    };

    const out = await service.recognizeFromImage(Buffer.from('not-an-image'), 'image/jpeg');
    expect(out.success).toBe(true);
    expect(out.durationMs).toBeGreaterThanOrEqual(0);
  });
});
