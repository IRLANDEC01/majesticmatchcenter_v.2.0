import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { GET } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers.js';
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
      await createTestMapTemplate({ name: 'Archived GET Test', isArchived: true });

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
        isArchived: true,
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
      const archivedTemplate = await createTestMapTemplate({ name: 'Archived for all check', isArchived: true });

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

    it('должен кэшировать GET запросы', async () => {
      await createTestMapTemplate({ name: 'Cached Template Test' });

      const url = 'http://localhost/api/admin/map-templates';
      const req1 = new Request(url);
      
      const response1 = await GET(req1 as any);
      const body1 = await response1.json();
      
      expect(response1.status).toBe(200);
      expect(body1.data.length).toBe(1);
      expect(body1.data[0].name).toBe('Cached Template Test');
    });
  });
}); 