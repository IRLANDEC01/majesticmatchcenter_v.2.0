import { revalidatePath } from 'next/cache';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers';

vi.mock('next/cache');

describe('/api/admin/map-templates/:id', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('должен успешно возвращать шаблон по ID', async () => {
      await clearTestDB();
      const template = await createTestMapTemplate({
        name: 'Test GET',
        imageUrls: {
          icon: 'https://placehold.co/icon.png',
          medium: 'https://placehold.co/image.png',
          original: 'https://placehold.co/original.png',
        },
      });

      const req = new Request(`http://localhost/api/admin/map-templates/${template.id}`);
      const params = Promise.resolve({ id: template.id });
      const response = await GET(req as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe('Test GET');
      expect(body.data.imageUrls.medium).toBe('https://placehold.co/image.png');
    });

    it('должен возвращать 404, если ID не существует', async () => {
      await clearTestDB();
      const nonExistentId = '605c72ef9f1b2c001f7b8b17';
      const req = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}`);
      const params = Promise.resolve({ id: nonExistentId });
      const response = await GET(req as any, { params });
      expect(response.status).toBe(404);
    });
  });
}); 