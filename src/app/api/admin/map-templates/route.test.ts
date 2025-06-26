import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers';
import MapTemplate from '@/models/map/MapTemplate';
import { StatusCodes } from 'http-status-codes';

vi.mock('next/cache');

describe('/api/admin/map-templates', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
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
      for (let i = 1; i <= 15; i++) {
        await createTestMapTemplate({ name: `Template ${i}` });
      }

      const req = new Request('http://localhost/api/admin/map-templates?page=2&limit=10');
      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(5);
      expect(body.page).toBe(2);
      expect(body.total).toBe(15);
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
      await createTestMapTemplate({ name: 'Dust2 Map' });
      await createTestMapTemplate({ name: 'Inferno Map' });
      await createTestMapTemplate({ name: 'Another Template' });

      const req = new Request('http://localhost/api/admin/map-templates?q=Map');
      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
    });
  });

  describe('POST', () => {
    it('должен создать новый шаблон карты при валидных данных', async () => {
      const payload = {
        name: 'New Map Template',
        mapTemplateImage: 'https://example.com/image.png',
      };

      const req = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await POST(req as any);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.name).toBe(payload.name);
      expect(body.data.slug).toBe('new-map-template');
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      await createTestMapTemplate({ name: 'Existing Template' });

      const payload = {
        name: 'Existing Template',
        mapTemplateImage: 'https://example.com/image.png',
      };

      const req = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await POST(req as any);
      expect(response.status).toBe(409);
    });

    it('должен возвращать 400 при невалидных данных (например, без названия)', async () => {
      const payload = {
        mapTemplateImage: 'https://example.com/image.png',
      };

      const req = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await POST(req as any);
      expect(response.status).toBe(400);
    });
  });
}); 