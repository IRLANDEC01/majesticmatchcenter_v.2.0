import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { GET, POST } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers';
import MapTemplate from '@/models/map/MapTemplate';
import { revalidatePath } from 'next/cache';

vi.mock('next/cache');

describe('/api/admin/map-templates', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  describe('GET', () => {
    it('должен возвращать список активных шаблонов по умолчанию', async () => {
      await createTestMapTemplate({ name: 'Active Template' });
      await createTestMapTemplate({ name: 'Archived Template', archivedAt: new Date() });

      const req = new Request('http://localhost/api/admin/map-templates');

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Active Template');
    });

    it('должен корректно применять пагинацию', async () => {
      for (let i = 0; i < 15; i++) {
        await createTestMapTemplate({ name: `Template ${i}` });
      }

      const req = new Request('http://localhost/api/admin/map-templates?page=2&limit=5');

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(5);
      expect(body.page).toBe(2);
      expect(body.total).toBe(15);
      expect(body.totalPages).toBe(3);
    });

    it('должен возвращать только архивные шаблоны при status=archived', async () => {
      await createTestMapTemplate({ name: 'Active Template' });
      await createTestMapTemplate({ name: 'Archived Template', archivedAt: new Date() });

      const req = new Request('http://localhost/api/admin/map-templates?status=archived');

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Archived Template');
    });

    it('должен возвращать все шаблоны при status=all', async () => {
      await createTestMapTemplate({ name: 'Active Template' });
      await createTestMapTemplate({ name: 'Archived Template', archivedAt: new Date() });

      const req = new Request('http://localhost/api/admin/map-templates?status=all');

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
    });

    it('должен фильтровать по имени с помощью параметра q', async () => {
      await createTestMapTemplate({ name: 'Apple Template' });
      await createTestMapTemplate({ name: 'Banana Template' });

      const req = new Request('http://localhost/api/admin/map-templates?q=apple');

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Apple Template');
    });
  });

  describe('POST', () => {
    it('должен успешно создавать новый шаблон', async () => {
      const templateData = {
        name: 'My New Awesome Template',
        description: 'description',
        mapImage: 'path/to/image.jpg',
      };
      const req = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const response = await POST(req as any);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe(templateData.name);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

      const dbTemplate = await MapTemplate.findById(body.data._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      const name = 'Existing Template';
      await createTestMapTemplate({ name });

      const req = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: 'd', mapImage: 'i' }),
      });

      const response = await POST(req as any);
      expect(response.status).toBe(409);
    });

    it('должен возвращать 400 при невалидных данных (например, без названия)', async () => {
      const req = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'description only' }),
      });

      const response = await POST(req as any);
      expect(response.status).toBe(400);
    });
  });
}); 