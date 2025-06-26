import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { HydratedDocument } from 'mongoose';
import { GET, PATCH } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestTournamentTemplate,
} from '@/lib/test-helpers';
import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { revalidatePath } from 'next/cache';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('/api/admin/tournament-templates/[id]', () => {
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
    it('должен возвращать шаблон турнира по ID', async () => {
      await clearTestDB();
      const testTemplate = await createTestTournamentTemplate({
        name: 'Test Template',
        tournamentTemplateImage: 'https://example.com/image.png',
      });
      
      const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate.id}`);
      const response = await GET(request as any, { params: { id: testTemplate.id } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.name).toBe('Test Template');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      await clearTestDB();
      const nonExistentId = '605c72ef9f1b2c001f7b8b17'; // Используем валидный, но несуществующий ID
      const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`);
      const response = await GET(request as any, { params: { id: nonExistentId } });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и вызывать revalidatePath', async () => {
      await clearTestDB();
      const testTemplate = await createTestTournamentTemplate({
        name: 'Test Template',
        tournamentTemplateImage: 'https://example.com/image.png',
      });
      
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        tournamentTemplateImage: 'https://example.com/new.png',
      };
      const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request as any, { params: { id: testTemplate.id } });
      const body = await response.json();
      const dbTemplate = await TournamentTemplate.findById(testTemplate.id);

      expect(response.status).toBe(200);
      expect(body.data.name).toBe('Updated Name');
      expect(dbTemplate?.description).toBe('Updated description');
      expect(dbTemplate?.tournamentTemplateImage).toBe('https://example.com/new.png');
      expect(revalidatePath).toHaveBeenCalledTimes(2);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${testTemplate.id}`);
    });

    it('должен возвращать 409 при попытке установить уже существующее имя', async () => {
      await clearTestDB();
      const testTemplate = await createTestTournamentTemplate({
        name: 'Test Template',
        tournamentTemplateImage: 'https://example.com/image.png',
      });
      await createTestTournamentTemplate({ name: 'Existing Name' });
      
      const updateData = { name: 'Existing Name' };
      const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request as any, { params: { id: testTemplate.id } });

      expect(response.status).toBe(409);
    });

    describe('Validation', () => {
      it('должен возвращать 400, если название слишком короткое', async () => {
        await clearTestDB();
        const testTemplate = await createTestTournamentTemplate({
          name: 'Test Template',
          tournamentTemplateImage: 'https://example.com/image.png',
        });
        
        // Arrange
        const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: 'a' }),
          headers: { 'Content-Type': 'application/json' },
        });

        // Act
        const response = await PATCH(request as any, { params: { id: testTemplate.id } });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(body.errors.name).toBeDefined();
      });

      it('должен возвращать 400, если массив шаблонов карт пустой', async () => {
        await clearTestDB();
        const testTemplate = await createTestTournamentTemplate({
          name: 'Test Template',
          tournamentTemplateImage: 'https://example.com/image.png',
        });
        
        // Arrange
        const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ mapTemplates: [] }),
          headers: { 'Content-Type': 'application/json' },
        });

        // Act
        const response = await PATCH(request as any, { params: { id: testTemplate.id } });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(body.errors.mapTemplates).toBeDefined();
      });
    });
  });
}); 