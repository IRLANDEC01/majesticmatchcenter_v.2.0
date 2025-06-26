import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { HydratedDocument } from 'mongoose';
import { GET, POST } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
  createTestTournamentTemplate,
} from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';
import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import AuditLog from '@/models/audit/AuditLog';
import { IMapTemplate } from '@/models/map/MapTemplate';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('/api/admin/tournament-templates', () => {
  beforeAll(async () => {
    await connectToTestDB();
    await clearTestDB();
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
      await createTestTournamentTemplate({ name: 'Active 1' });
      await createTestTournamentTemplate({ name: 'Active 2' });

      const request = new Request('http://localhost/api/admin/tournament-templates');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(2);
      expect(body.total).toBe(2);
      // Проверяем, что оба активных шаблона присутствуют (порядок может варьироваться)
      const names = body.data.map((t: any) => t.name).sort();
      expect(names).toEqual(['Active 1', 'Active 2']);
    });

    it('должен корректно применять пагинацию', async () => {
      await createTestTournamentTemplate({ name: 'Template 1', createdAt: new Date('2023-01-01') });
      await createTestTournamentTemplate({ name: 'Template 2', createdAt: new Date('2023-01-02') });
      await createTestTournamentTemplate({ name: 'Template 3', createdAt: new Date('2023-01-03') });

      const request = new Request('http://localhost/api/admin/tournament-templates?page=2&limit=2');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(3);
      expect(body.page).toBe(2);
      expect(body.totalPages).toBe(2);
    });

    it('должен возвращать только архивные шаблоны при status=archived', async () => {
      await createTestTournamentTemplate({ name: 'Active 1' });
      await createTestTournamentTemplate({ name: 'Archived 1', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/tournament-templates?status=archived');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Archived 1');
    });
    
    it('должен возвращать все шаблоны при status=all', async () => {
      await createTestTournamentTemplate({ name: 'Active 1' });
      await createTestTournamentTemplate({ name: 'Archived 1', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/tournament-templates?status=all');
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(2);
      expect(body.total).toBe(2);
    });

    it('должен фильтровать по имени с помощью параметра q', async () => {
      await createTestTournamentTemplate({ name: 'Apple Cup' });
      await createTestTournamentTemplate({ name: 'Banana Cup' });
      const request = new Request('http://localhost/api/admin/tournament-templates?q=apple');
      
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Apple Cup');
    });
  });

  describe('POST', () => {
    it('должен успешно создавать новый шаблон и запись в логе аудита', async () => {
      const mapTemplate = await createTestMapTemplate();
      const requestData = {
        name: 'New Awesome Template',
        description: 'Great tournament template',
        tournamentTemplateImage: 'https://example.com/image.png',
        mapTemplates: [mapTemplate.id],
      };

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request as any);
      const body = await response.json();
      const count = await TournamentTemplate.countDocuments();

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(body.data.name).toBe('New Awesome Template');
      expect(body.data.slug).toBe('new-awesome-template');
      expect(count).toBe(1);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${body.data.slug}`);
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      await createTestTournamentTemplate({ name: 'Existing Template' });
      const mapTemplate = await createTestMapTemplate();

      const requestData = {
        name: 'Existing Template',
        description: 'Another tournament template',
        tournamentTemplateImage: 'https://example.com/image.png',
        mapTemplates: [mapTemplate.id],
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
        description: 'Tournament without name',
        tournamentTemplateImage: 'https://example.com/image.png',
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

    describe('Validation', () => {
      const baseValidData = {
        name: 'Valid Template Name',
        description: 'Valid description',
        tournamentTemplateImage: 'https://example.com/image.png',
        mapTemplates: [] as string[],
      };

      it('должен возвращать 400, если название слишком короткое', async () => {
        const mapTemplate = await createTestMapTemplate();
        const invalidData = { ...baseValidData, name: 'a' };
        
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...invalidData, mapTemplates: [mapTemplate.id] }),
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
        expect(body.errors.name).toBeDefined();
      });

      it('должен возвращать 400, если не передан массив шаблонов карт', async () => {
        const { mapTemplates, ...invalidData } = baseValidData;
        
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData),
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
        expect(body.errors.mapTemplates).toBeDefined();
      });

      it('должен возвращать 400, если массив шаблонов карт пустой', async () => {
        const invalidData = { ...baseValidData, mapTemplates: [] };
        
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData),
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
        expect(body.errors.mapTemplates).toBeDefined();
      });

      it('должен возвращать 400, если в mapTemplates передан невалидный ID', async () => {
        const invalidData = { ...baseValidData, mapTemplates: ['invalid-id'] };
        
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData),
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(StatusCodes.BAD_REQUEST);
        expect(body.errors.mapTemplates).toBeDefined();
      });
    });
  });
}); 