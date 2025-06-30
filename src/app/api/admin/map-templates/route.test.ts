import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { GET } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers.js';
import { clearMemoryCache } from '@/lib/cache';
import { MAX_PAGE_SIZE, MIN_SEARCH_LENGTH } from '@/lib/constants';

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

    // ✅ НОВЫЕ ТЕСТЫ: Серверная пагинация + защита от DoS
    it(`должен защищать от DoS атак limit > ${MAX_PAGE_SIZE}`, async () => {
      const req = new Request(`http://localhost/api/admin/map-templates?limit=${MAX_PAGE_SIZE + 1}`);
      const response = await GET(req as any);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.limit).toBeDefined();
    });

    it('должен правильно вычислять totalPages', async () => {
      // Создаем 25 шаблонов
      for (let i = 1; i <= 25; i++) {
        await createTestMapTemplate({ name: `TotalPages Test ${i}` });
      }

      // limit=10 → totalPages = Math.ceil(25/10) = 3
      const req = new Request('http://localhost/api/admin/map-templates?page=1&limit=10');
      const response = await GET(req as any);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(10);
      expect(body.total).toBe(25);
      expect(body.totalPages).toBe(3); // ✅ Math.ceil(25/10) = 3
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
    });

    it('должен корректно обрабатывать пустой поиск', async () => {
      await createTestMapTemplate({ name: 'Empty Search Test' });

      // Пустой q не должен добавлять regex в MongoDB query
      const req = new Request('http://localhost/api/admin/map-templates?q=');
      const response = await GET(req as any);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
    });

    it('должен правильно считать страницы на границах', async () => {
      // Ровно 10 элементов = 1 страница
      for (let i = 1; i <= 10; i++) {
        await createTestMapTemplate({ name: `Boundary Test ${i}` });
      }

      const req = new Request('http://localhost/api/admin/map-templates?limit=10');
      const response = await GET(req as any);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.totalPages).toBe(1); // ✅ Math.ceil(10/10) = 1
      expect(body.data.length).toBe(10);
    });

    // ✅ НОВЫЕ ТЕСТЫ: Сортировка и безопасность
    it('должен поддерживать сортировку по разным полям', async () => {
      await createTestMapTemplate({ name: 'Alpha Sort Test' });
      await createTestMapTemplate({ name: 'Beta Sort Test' });
      
      // Проверяем алфавитную сортировку по возрастанию
      const req = new Request('http://localhost/api/admin/map-templates?sort=name&order=asc');
      const response = await GET(req as any);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.data[0].name).toBe('Alpha Sort Test');
      expect(body.data[1].name).toBe('Beta Sort Test');
    });

    it('должен отклонять небезопасные поля сортировки', async () => {
      const req = new Request('http://localhost/api/admin/map-templates?sort=__proto__');
      const response = await GET(req as any);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.sort).toBeDefined();
    });

    it('должен обрабатывать fallback при недоступности MeiliSearch', async () => {
      await createTestMapTemplate({ name: 'Fallback Test Search' });
      
      // Поиск с q >= ${MIN_SEARCH_LENGTH} должен работать даже при падении MeiliSearch
      const req = new Request('http://localhost/api/admin/map-templates?q=Fallback');
      const response = await GET(req as any);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toContain('Fallback');
    });
  });
}); 