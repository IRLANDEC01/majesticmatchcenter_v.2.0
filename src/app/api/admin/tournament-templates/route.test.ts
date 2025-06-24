import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import { dbClear, createTestMapTemplate, createTestTournamentTemplate } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('/api/admin/tournament-templates', () => {
  beforeEach(async () => {
    await dbClear();
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('должен возвращать список шаблонов турниров', async () => {
      // Arrange
      await createTestTournamentTemplate({ name: 'Template 1' });
      await createTestTournamentTemplate({ name: 'Template 2' });
      const request = new Request('http://localhost/api/admin/tournament-templates');

      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
      expect(body.total).toBe(2);
    });
  });

  describe('POST', () => {
    it('должен успешно создавать новый шаблон турнира', async () => {
      // Arrange
      const mapTemplate = await createTestMapTemplate();
      const newTemplateData = {
        name: 'New Majestic Cup',
        description: 'A brand new tournament template.',
        tournamentTemplateImage: 'http://example.com/new_image.png',
        mapTemplates: [mapTemplate._id.toString()],
      };
      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplateData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();
      const count = await TournamentTemplate.countDocuments();

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe('New Majestic Cup');
      expect(body.slug).toBe('new-majestic-cup');
      expect(count).toBe(1);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it('должен возвращать 409, если шаблон с таким именем уже существует', async () => {
      // Arrange
      await createTestTournamentTemplate({ name: 'Existing Template' });
      const mapTemplate = await createTestMapTemplate();
      const newTemplateData = {
        name: 'Existing Template', // Имя, которое уже существует
        tournamentTemplateImage: 'http://example.com/image.png',
        mapTemplates: [mapTemplate._id.toString()],
      };
      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplateData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(body.message).toContain('уже существует');
    });

    it('должен возвращать 400 при невалидных данных (например, без названия)', async () => {
      // Arrange
      const mapTemplate = await createTestMapTemplate();
      const invalidData = {
        // name: 'Missing Name', // Поле name отсутствует
        description: 'Invalid data test',
        tournamentTemplateImage: 'http://example.com/invalid.png',
        mapTemplates: [mapTemplate._id.toString()],
      };
      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
    });

    describe('Validation', () => {
      const baseValidData = {
        name: 'Valid Tournament Name',
        tournamentTemplateImage: '/images/valid.png',
        mapTemplates: ['605c72a6b579624e50a9d8e1'],
      };

      it('должен возвращать 400, если название слишком короткое', async () => {
        const invalidData = { ...baseValidData, name: 'a' };
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST', body: JSON.stringify(invalidData), headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.errors.name).toBeDefined();
      });

      it('должен возвращать 400, если не передан массив шаблонов карт', async () => {
        const { mapTemplates, ...invalidData } = baseValidData;
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST', body: JSON.stringify(invalidData), headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.errors.mapTemplates).toBeDefined();
      });

      it('должен возвращать 400, если массив шаблонов карт пустой', async () => {
        const invalidData = { ...baseValidData, mapTemplates: [] };
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST', body: JSON.stringify(invalidData), headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.errors.mapTemplates).toBeDefined();
      });

      it('должен возвращать 400, если в mapTemplates передан невалидный ID', async () => {
        const invalidData = { ...baseValidData, mapTemplates: ['invalid-id'] };
        const request = new Request('http://localhost/api/admin/tournament-templates', {
          method: 'POST', body: JSON.stringify(invalidData), headers: { 'Content-Type': 'application/json' },
        });
        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.errors.mapTemplates).toBeDefined();
      });
    });
  });
}); 