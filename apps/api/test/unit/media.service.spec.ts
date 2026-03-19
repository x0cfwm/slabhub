import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { MediaService } from '../../src/modules/media/media.service';
import { createPrismaMock } from '../mocks/prisma.mock';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MediaService', () => {
  let prisma: any;
  let s3ClientService: any;
  let configService: any;
  let service: MediaService;

  beforeEach(() => {
    prisma = createPrismaMock();
    s3ClientService = {
      getBucket: jest.fn().mockReturnValue('bucket'),
      getClient: jest.fn().mockReturnValue({ send: jest.fn().mockResolvedValue({ ETag: '"etag"' }) }),
    };
    configService = {
      get: jest.fn((key: string, fallback?: any) => {
        const map: Record<string, any> = {
          S3_ALLOWED_MIME: 'image/jpeg,image/png,image/webp',
          S3_UPLOAD_MAX_BYTES: 10_000,
          S3_CDN_BASE_URL: 'https://cdn.test',
          S3_PUBLIC_BASE_URL: 'https://public.test',
          S3_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
          S3_FORCE_PATH_STYLE: false,
        };
        return key in map ? map[key] : fallback;
      }),
    };

    service = new MediaService(prisma, s3ClientService, configService);
  });

  it('rejects oversize uploads', async () => {
    const buf = Buffer.alloc(20_000);
    await expect(service.putBuffer({ buffer: buf, mimeType: 'image/jpeg' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported mime type', async () => {
    const buf = Buffer.from('x');
    await expect(service.putBuffer({ buffer: buf, mimeType: 'application/pdf' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deduplicates existing media by hash', async () => {
    prisma.media.findUnique.mockResolvedValue({ id: 'm1' });
    const out = await service.putBuffer({ buffer: Buffer.from('hello'), mimeType: 'image/jpeg' });
    expect(out.id).toBe('m1');
  });

  it('stores media when upload succeeds', async () => {
    prisma.media.findUnique.mockResolvedValue(null);
    prisma.media.create.mockResolvedValue({ id: 'm2', key: 'k', hash: 'h', mimeType: 'image/jpeg', sizeBytes: 1 });

    const out = await service.putBuffer({ buffer: Buffer.from('a'), mimeType: 'image/jpeg' });
    expect(out.id).toBe('m2');
    expect(prisma.media.create).toHaveBeenCalled();
  });

  it('wraps upload errors', async () => {
    prisma.media.findUnique.mockResolvedValue(null);
    s3ClientService.getClient.mockReturnValue({ send: jest.fn().mockRejectedValue(new Error('boom')) });

    await expect(service.putBuffer({ buffer: Buffer.from('a'), mimeType: 'image/jpeg' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('downloads remote url and forwards to putBuffer', async () => {
    mockedAxios.get.mockResolvedValue({ data: Buffer.from('x'), headers: { 'content-type': 'image/png' } } as any);
    prisma.media.findUnique.mockResolvedValue({ id: 'm1' });

    await expect(service.putFromRemoteUrl('https://x.test/image.png')).resolves.toEqual({ id: 'm1' });
  });

  it('ensures CDN URL replacement', () => {
    const out = service.ensureCdnUrl('https://public.test/media/x.jpg');
    expect(out).toBe('https://cdn.test/media/x.jpg');
  });
});
