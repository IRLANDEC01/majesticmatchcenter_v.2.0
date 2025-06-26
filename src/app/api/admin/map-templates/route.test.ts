import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate';
import { StatusCodes } from 'http-status-codes';
import { clearMemoryCache } from '@/lib/cache';

vi.mock('next/cache');

describe('/api/admin/map-templates', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
     clearMemoryCache();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  describe('GET', () => {
    it('должен возвращать список активных шаблонов по умолчанию', async () => {
      const activeTemplate = await createTestMapTemplate({ name: 'Active GET Test' });
      await createTestMapTemplate({ name: 'Archived GET Test', archivedAt: new Date() });

      const req = new Request('http://localhost/api/admin/map-templates');
      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe(activeTemplate.name);
    });

    it('должен корректно применять пагинацию', async () => {
      for (let i = 1; i <= 15; i++) {
        await createTestMapTemplate({ name: `Pagination Test ${i}` });
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
      await createTestMapTemplate({ name: 'Active for archive check' });
      const archivedTemplate = await createTestMapTemplate({
        name: 'Archived for check',
        archivedAt: new Date(),
      });

      const req = new Request('http://localhost/api/admin/map-templates?status=archived');
      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe(archivedTemplate.name);
    });

    it('должен возвращать все шаблоны при status=all', async () => {
      await createTestMapTemplate({ name: 'Active for all check' });
      await createTestMapTemplate({ name: 'Archived for all check', archivedAt: new Date() });

      const req = new Request('http://localhost/api/admin/map-templates?status=all');
      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
    });

    it('должен фильтровать по имени с помощью параметра q', async () => {
      await createTestMapTemplate({ name: 'Dust2 Search' });
      await createTestMapTemplate({ name: 'Inferno Search' });
      await createTestMapTemplate({ name: 'Another Template' });

      const req = new Request('http://localhost/api/admin/map-templates?q=Search');
      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
    });
  });

  describe('POST', () => {
    it('должен создать новый шаблон карты при валидных данных', async () => {
      const payload = {
        name: 'New POST Template',
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
      expect(body.data.slug).toBe('new-post-template');
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      const existingName = 'Existing Conflict Template';
      await createTestMapTemplate({ name: existingName });

      const payload = {
        name: existingName,
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

  describe('Caching', () => {
    it('должен кэшировать GET, инвалидировать после POST и возвращать свежие данные', async () => {
      await createTestMapTemplate({ name: 'Initial Cached Template' });

      const url = 'http://localhost/api/admin/map-templates';
      const req1 = new Request(url);
      
      const response1 = await GET(req1 as any);
      const body1 = await response1.json();
      expect(body1.data.length).toBe(1);

      await MapTemplate.create({
        name: 'Template added after cache',
        mapTemplateImage: 'image.png',
      });
      
      const req2 = new Request(url);
      const response2 = await GET(req2 as any);
      const body2 = await response2.json();
      
      expect(response2.status).toBe(200);
      expect(body2.data.length).toBe(1);

      const payload = { name: 'Another New Template to Invalidate', mapTemplateImage: 'http://example.com/image.png' };
      const req4 = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await POST(req4 as any);

      const req3 = new Request(url);
      const response3 = await GET(req3 as any);
      const body3 = await response3.json();

      expect(response3.status).toBe(200);
      expect(body3.data.length).toBe(3);
    });
  });
}); 