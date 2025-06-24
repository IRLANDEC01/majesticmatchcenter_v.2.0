import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PATCH } from './route';
import { createTestTournamentTemplate, dbClear } from '@/lib/test-helpers';
import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { revalidatePath } from 'next/cache';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('/api/admin/tournament-templates/[id]', () => {
  let testTemplate: ITournamentTemplate;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();
    testTemplate = await createTestTournamentTemplate({
      name: 'Test Template',
      tournamentTemplateImage: 'https://example.com/image.png',
    });
  });

  describe('GET', () => {
    it('должен возвращать шаблон турнира по ID', async () => {
      const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate._id.toString()}`);
      const response = await GET(request, { params: { id: testTemplate._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Test Template');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      const nonExistentId = '605c72ef9f1b2c001f7b8b17'; // Используем валидный, но несуществующий ID
      const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`);
      const response = await GET(request, { params: { id: nonExistentId } });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и вызывать revalidatePath', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        tournamentTemplateImage: 'https://example.com/new.png',
      };
      const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate._id.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: testTemplate._id.toString() } });
      const body = await response.json();
      const dbTemplate = await TournamentTemplate.findById(testTemplate._id);

      expect(response.status).toBe(200);
      expect(body.name).toBe('Updated Name');
      expect(dbTemplate?.description).toBe('Updated description');
      expect(dbTemplate?.tournamentTemplateImage).toBe('https://example.com/new.png');
      expect(revalidatePath).toHaveBeenCalledTimes(2);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${testTemplate._id.toString()}`);
    });

    it('должен возвращать 409 при попытке установить уже существующее имя', async () => {
      await createTestTournamentTemplate({ name: 'Existing Name' });
      const updateData = { name: 'Existing Name' };
      const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate._id.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: testTemplate._id.toString() } });

      expect(response.status).toBe(409);
    });
  });
}); 