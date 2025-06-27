import { revalidatePath } from 'next/cache';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET, PATCH } from './route';
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
        mapTemplateImage: 'https://placehold.co/image.png',
      });

      const req = new Request(`http://localhost/api/admin/map-templates/${template.id}`);
      const params = Promise.resolve({ id: template.id });
      const response = await GET(req as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe('Test GET');
      expect(body.data.mapTemplateImage).toBe('https://placehold.co/image.png');
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

  describe('PATCH', () => {
    it('должен успешно обновлять все поля шаблона', async () => {
      await clearTestDB();
      const template = await createTestMapTemplate({
        name: 'Initial Name',
        mapTemplateImage: 'https://placehold.co/initial.png',
      });

      const payload = {
        name: 'Updated Name',
        mapTemplateImage: 'https://placehold.co/updated.png',
        description: 'Updated description',
      };
      const req = new Request(`http://localhost/api/admin/map-templates/${template.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const params = Promise.resolve({ id: template.id });
      const response = await PATCH(req as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe(payload.name);
      expect(body.data.mapTemplateImage).toBe(payload.mapTemplateImage);
      expect(body.data.description).toBe(payload.description);

      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${template.id}`);
    });

    it('должен возвращать 409, если новое имя уже занято', async () => {
      await clearTestDB();
      const template1 = await createTestMapTemplate({ name: 'Template One' });
      await createTestMapTemplate({ name: 'Existing Name' });

      const req = new Request(`http://localhost/api/admin/map-templates/${template1.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      const params = Promise.resolve({ id: template1.id });
      const response = await PATCH(req as any, { params });
      expect(response.status).toBe(409);
    });
  });
}); 