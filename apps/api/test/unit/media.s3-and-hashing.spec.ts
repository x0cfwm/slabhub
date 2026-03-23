import { S3ClientService } from '../../src/modules/media/s3.client';
import { computeHash, generateObjectKey } from '../../src/modules/media/hashing';

describe('S3ClientService and hashing utils', () => {
  it('initializes bucket from config', () => {
    const configService = {
      get: jest.fn((key: string, fallback?: any) => {
        const values: Record<string, any> = {
          S3_BUCKET: 'bucket-1',
          S3_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
          S3_REGION: 'nyc3',
          S3_ACCESS_KEY_ID: 'a',
          S3_SECRET_ACCESS_KEY: 'b',
          S3_FORCE_PATH_STYLE: false,
        };
        return key in values ? values[key] : fallback;
      }),
    };

    const s3 = new S3ClientService(configService as any);
    expect(s3.getBucket()).toBe('bucket-1');
    expect(s3.getClient()).toBeDefined();
  });

  it('computes stable hash and object key', () => {
    const hash = computeHash(Buffer.from('hello'));
    expect(hash).toHaveLength(64);

    const key = generateObjectKey(hash, '.jpg');
    expect(key).toMatch(new RegExp(`^media/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash}\\.jpg$`));
  });
});
