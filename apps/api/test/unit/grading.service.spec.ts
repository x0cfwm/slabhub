import { GradingService } from '../../src/modules/grading/grading.service';

describe('GradingService', () => {
  it('returns PSA parsed result when API payload is valid', async () => {
    const httpClient = {
      fetchPsaCert: jest.fn().mockResolvedValue({
        PSACert: {
          GradeDescription: 'GEM MT 10',
          GradeValue: '10',
          CardLine: 'Luffy',
          Brand: 'OP',
          CardNumber: '001',
        },
      }),
    };

    const service = new GradingService(httpClient as any);
    const out = await service.lookup({ grader: 'PSA', certNumber: '123' } as any);

    expect(out.success).toBe(true);
    expect(out.data?.gradeValue).toBe('10');
  });

  it('returns unsupported grader failure', async () => {
    const service = new GradingService({ fetchPsaCert: jest.fn() } as any);
    const out = await service.lookup({ grader: 'SGC', certNumber: '1' } as any);
    expect(out.success).toBe(false);
  });

  it('uses cache for subsequent successful lookups', async () => {
    const httpClient = {
      fetchPsaCert: jest.fn().mockResolvedValue({
        PSACert: { GradeDescription: '9', GradeValue: '9', CardLine: 'X', Brand: 'B', CardNumber: '1' },
      }),
    };
    const service = new GradingService(httpClient as any);

    await service.lookup({ grader: 'PSA', certNumber: 'cache' } as any);
    await service.lookup({ grader: 'PSA', certNumber: 'cache' } as any);

    expect(httpClient.fetchPsaCert).toHaveBeenCalledTimes(1);
  });
});
