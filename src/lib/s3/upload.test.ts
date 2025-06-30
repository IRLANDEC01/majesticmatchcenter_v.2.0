import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { uploadImageVariants, deleteImageVariants } from './upload';
import { PassThrough } from 'stream';
import sharp from 'sharp';
import * as imageProcessing from '../image-processing/variants';
import { s3Client } from './client';
import { IMAGE_UPLOAD_CONFIG } from '@/lib/constants';

// Мокаем S3 клиент
const s3Mock = mockClient(s3Client as unknown as S3Client);

// Мокаем crypto.randomUUID для предсказуемых тестов
const mockUuid = '12345678-1234-1234-1234-123456789abc';
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => mockUuid },
  writable: true
});

// Мокаем модули обработки изображений
vi.mock('../image-processing/variants', () => ({
  validateAndPrepareImage: vi.fn().mockResolvedValue(Buffer.from('mock-buffer')),
  makeVariants: vi.fn().mockResolvedValue([
    { name: 'icon', buffer: Buffer.from('icon-data'), width: 64, height: 64, size: 1024 },
    { name: 'medium', buffer: Buffer.from('medium-data'), width: 640, height: 480, size: 5120 },
    { name: 'original', buffer: Buffer.from('original-data'), width: 1920, height: 1440, size: 15360 },
  ]),
}));

vi.mock('../image-processing/specs', () => ({
  getVariantSpecs: vi.fn().mockReturnValue([
    { name: 'icon', width: 64, height: 64 },
    { name: 'medium', width: 640 },
    { name: 'original', width: 1920 },
  ]),
}));

// Мокаем env
vi.mock('../env/validation', () => ({
  env: {
    S3_BUCKET: 'test-bucket',
    NEXT_PUBLIC_S3_PUBLIC_URL: 'https://cdn.example.com',
  },
}));

// Мокирование зависимостей
vi.mock('./client');


describe('S3 Upload Service', () => {
  beforeEach(() => {
    s3Mock.reset();
    vi.clearAllMocks();
  });

  describe('uploadImageVariants', () => {
    it('должен успешно загружать все варианты изображения', async () => {
      // Мокаем успешные ответы S3
      s3Mock.on(PutObjectCommand).resolves({});

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await uploadImageVariants(mockFile, 'map-template');

      // Проверяем структуру результата
      expect(result).toEqual({
        keys: {
          icon: `maps/${mockUuid}/icon.webp`,
          medium: `maps/${mockUuid}/medium.webp`,
          original: `maps/${mockUuid}/original.webp`,
        },
        urls: {
          icon: `https://cdn.example.com/maps/${mockUuid}/icon.webp`,
          medium: `https://cdn.example.com/maps/${mockUuid}/medium.webp`,
          original: `https://cdn.example.com/maps/${mockUuid}/original.webp`,
        },
        metadata: {
          originalSize: 4, // размер mock файла
          variants: [
            { name: 'icon', size: 1024, width: 64, height: 64 },
            { name: 'medium', size: 5120, width: 640, height: 480 },
            { name: 'original', size: 15360, width: 1920, height: 1440 },
          ],
        },
      });

      // Проверяем количество вызовов S3
      expect(s3Mock.calls()).toHaveLength(3);
      
      // Для отладки можно раскомментировать:
      // expect(s3Mock.calls()).toMatchSnapshot();
    });

    it('должен использовать переданный entityId', async () => {
      s3Mock.on(PutObjectCommand).resolves({});
      
      const customId = 'custom-entity-id';
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await uploadImageVariants(mockFile, 'maps', customId);

      expect(result.keys.icon).toBe(`maps/${customId}/icon.webp`);
      expect(result.urls.icon).toBe(`https://cdn.example.com/maps/${customId}/icon.webp`);
    });

    it('должен выполнять rollback при ошибке загрузки', async () => {
      // Первый запрос успешен, второй падает
      s3Mock
        .on(PutObjectCommand).resolvesOnce({})
        .on(PutObjectCommand).rejectsOnce(new Error('S3 Error'));

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(uploadImageVariants(mockFile, 'maps')).rejects.toThrow('Ошибка загрузки изображения');

      // Проверяем, что были вызовы на удаление (rollback)
      const allCalls = s3Mock.calls();
      const deleteCalls = allCalls.filter(call => 
        call.args[0] instanceof DeleteObjectCommand
      );
      expect(deleteCalls.length).toBeGreaterThan(0);
    });

    it('должен корректно обрабатывать метаданные файла', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const mockFile = new File(['test-content'], 'my-image.png', { type: 'image/png' });
      
      await uploadImageVariants(mockFile, 'players');

      // Проверяем метаданные в первом вызове
      const firstCall = s3Mock.calls()[0];
      const command = firstCall.args[0] as PutObjectCommand;
      const metadata = command.input.Metadata;

      expect(metadata).toEqual({
        variant: 'icon',
        entityType: 'players',
        originalName: 'my-image.png',
        width: '64',
        height: '64',
      });
    });

    it('should upload variants and return keys and URLs', async () => {
      // Мокируем результат обработки изображения
      vi.mocked(imageProcessing.validateAndPrepareImage).mockResolvedValue(Buffer.from('test'));
      vi.mocked(imageProcessing.makeVariants).mockResolvedValue([
        { name: 'medium', buffer: Buffer.from('medium'), width: 640, height: 480, size: 100 },
        { name: 'thumbnail', buffer: Buffer.from('thumbnail'), width: 128, height: 128, size: 20 },
      ]);

      s3Mock.on(PutObjectCommand).resolves({});

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadImageVariants(file, 'map-template');

      expect(result.urls.medium).toContain('https://s3.storage.selcloud.ru/mmc-images/map-template/medium/');
      expect(result.keys.thumbnail).toContain('map-template/thumbnail/');
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBe(2);
    });

    it('should throw error if image validation fails', async () => {
      vi.mocked(imageProcessing.validateAndPrepareImage).mockRejectedValue(new Error('File too large'));

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await expect(uploadImageVariants(file, 'maps')).rejects.toThrow('File too large');
    });

    it('should rollback uploads if one variant fails', async () => {
      vi.mocked(imageProcessing.validateAndPrepareImage).mockResolvedValue(Buffer.from('test'));
      vi.mocked(imageProcessing.makeVariants).mockResolvedValue([
        { name: 'medium', buffer: Buffer.from('medium'), width: 640, height: 480, size: 100 },
        { name: 'thumbnail', buffer: Buffer.from('thumbnail'), width: 128, height: 128, size: 20 },
      ]);

      s3Mock.on(PutObjectCommand).resolvesOnce({}); // Успешная первая загрузка
      s3Mock.on(PutObjectCommand).rejectsOnce(new Error('S3 upload failed')); // Ошибка на второй

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await expect(uploadImageVariants(file, 'maps')).rejects.toThrow('S3 upload failed');
      
      expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBe(1);
    });
  });

  describe('deleteImageVariants', () => {
    it('должен удалять все переданные ключи', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      const keys = [
        'maps/uuid1/icon.webp',
        'maps/uuid1/medium.webp',
        'maps/uuid1/original.webp',
      ];

      await deleteImageVariants(keys);

      expect(s3Mock.calls()).toHaveLength(3);
      
      // Проверяем, что удаляются правильные ключи
      const deleteCalls = s3Mock.calls();
      keys.forEach((key, index) => {
        const command = deleteCalls[index].args[0] as DeleteObjectCommand;
        expect(command.input.Key).toBe(key);
      });
    });

    it('должен корректно обрабатывать пустой массив', async () => {
      await deleteImageVariants([]);
      
      expect(s3Mock.calls()).toHaveLength(0);
    });

    it('не должен пробрасывать ошибки при удалении', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('Delete failed'));

      const keys = ['maps/uuid1/icon.webp'];

      // Не должно бросать исключение
      await expect(deleteImageVariants(keys)).resolves.toBeUndefined();
    });

    it('should send DeleteObjectCommand for each key', async () => {
      const keys = ['key1', 'key2'];
      s3Mock.on(DeleteObjectCommand).resolves({});
      
      await deleteImageVariants(keys);
      
      const deleteCalls = s3Mock.commandCalls(DeleteObjectCommand);
      expect(deleteCalls.length).toBe(keys.length);
      expect(deleteCalls[0].args[0].input).toEqual({ Bucket: 'mmc-images', Key: 'key1' });
      expect(deleteCalls[1].args[0].input).toEqual({ Bucket: 'mmc-images', Key: 'key2' });
    });

    it('should not throw if deletion fails', async () => {
      const keys = ['key1'];
      s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 delete failed'));
      
      await expect(deleteImageVariants(keys)).resolves.not.toThrow();
    });
  });
}); 