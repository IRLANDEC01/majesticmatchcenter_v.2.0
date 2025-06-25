import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { GET, PATCH } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';
import { HydratedDocument } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';

vi.mock('next/cache');

describe('/api/admin/map-templates/[id]', () => {
  let activeTemplate: HydratedDocument<IMapTemplate>;

  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    activeTemplate = await createTestMapTemplate({ name: 'Active Map' });
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  describe('GET', () => {
    it('должен успешно возвращать шаблон по ID', async () => {
      const req = new Request(`http://localhost/api/admin/map-templates/${activeTemplate.id}`);
      const response = await GET(req as any, { params: { id: activeTemplate.id } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe('Active Map');
    });

    it('должен возвращать 404, если ID не существует', async () => {
      const nonExistentId = '605c72ef9f1b2c001f7b8b17';
      const req = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}`);
      const response = await GET(req as any, { params: { id: nonExistentId } });
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон', async () => {
      const req = new Request(`http://localhost/api/admin/map-templates/${activeTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(req as any, { params: { id: activeTemplate.id } });
      expect(response.status).toBe(200);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${activeTemplate.id}`);
    });

    it('должен возвращать 409 при попытке установить уже существующее имя', async () => {
      await createTestMapTemplate({ name: 'Existing Name' });
      const req = new Request(`http://localhost/api/admin/map-templates/${activeTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      const response = await PATCH(req as any, { params: { id: activeTemplate.id } });
      expect(response.status).toBe(409);
    });
  });
}); 