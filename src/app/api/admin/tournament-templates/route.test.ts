import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { GET, POST } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
  createTestTournamentTemplate,
} from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import { clearMemoryCache } from '@/lib/cache';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('/api/admin/tournament-templates', () => {
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
      const template1 = await createTestTournamentTemplate({ name: 'Active GET 1', tournamentTemplateImage: 'https://example.com/image1.png' });
      const template2 = await createTestTournamentTemplate({ name: 'Active GET 2', tournamentTemplateImage: 'https://example.com/image2.png' });
      await createTestTournamentTemplate({ name: 'Archived GET', isArchived: true, tournamentTemplateImage: 'https://example.com/image3.png' });

      const request = new Request('http://localhost/api/admin/tournament-templates');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(2);
      const names = body.data.map((t: any) => t.name).sort();
      expect(names).toEqual([template1.name, template2.name].sort());
    });

    it('должен корректно применять пагинацию', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestTournamentTemplate({ tournamentTemplateImage: `https://example.com/image${i}.png` });
      }

      const request = new Request('http://localhost/api/admin/tournament-templates?page=2&limit=2');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      // При 5 элементах, page=2, limit=2: должно вернуть элементы 3-4 (2 элемента)
      expect(body.data.length).toBe(2);
      expect(body.total).toBe(5);
      expect(body.page).toBe(2);
    });

    it('должен возвращать только архивные шаблоны при status=archived', async () => {
      await createTestTournamentTemplate({ name: 'Active for archive check', tournamentTemplateImage: 'https://example.com/image4.png' });
      const archived = await createTestTournamentTemplate({ name: 'Archive for check', isArchived: true, tournamentTemplateImage: 'https://example.com/image5.png' });

      const request = new Request('http://localhost/api/admin/tournament-templates?status=archived');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe(archived.name);
    });
    
    it('должен возвращать все шаблоны при status=all', async () => {
      await createTestTournamentTemplate({ tournamentTemplateImage: 'https://example.com/image6.png' });
      await createTestTournamentTemplate({ isArchived: true, tournamentTemplateImage: 'https://example.com/image7.png' });

      const request = new Request('http://localhost/api/admin/tournament-templates?status=all');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(2);
    });

    it('должен фильтровать по имени с помощью параметра q', async () => {
      await createTestTournamentTemplate({ name: 'Apple Cup', tournamentTemplateImage: 'https://example.com/image8.png' });
      await createTestTournamentTemplate({ name: 'Banana Cup', tournamentTemplateImage: 'https://example.com/image9.png' });
      const request = new Request('http://localhost/api/admin/tournament-templates?q=Apple');
      
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Apple Cup');
    });
  });

  describe('POST', () => {
    it('должен успешно создавать новый шаблон', async () => {
      const mapTemplate = await createTestMapTemplate();
      const requestData = {
        name: 'New Awesome POST Template',
        mapTemplates: [mapTemplate.id],
        tournamentTemplateImage: 'https://example.com/image10.png',
      };

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(body.data.name).toBe('New Awesome POST Template');
      expect(body.data.slug).toBe('new-awesome-post-template');
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      const existingName = 'Existing Conflict Template';
      await createTestTournamentTemplate({ name: existingName, tournamentTemplateImage: 'https://example.com/image11.png' });
      const mapTemplate = await createTestMapTemplate();

      const requestData = {
        name: existingName,
        mapTemplates: [mapTemplate.id],
        tournamentTemplateImage: 'https://example.com/image12.png',
      };

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(StatusCodes.CONFLICT);
    });

    it('должен возвращать 400 при невалидных данных (например, без названия)', async () => {
      const mapTemplate = await createTestMapTemplate();
      const invalidData = {
        mapTemplates: [mapTemplate.id],
      };

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });
}); 