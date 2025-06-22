import { GET, PATCH } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/tournament-templates/[id]', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  let activeMapTemplate;
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
    activeMapTemplate = await MapTemplate.create({
      name: 'Test Map',
      slug: 'test-map',
    });
  });

  describe('GET', () => {
    it('должен успешно находить и возвращать шаблон по ID', async () => {
      const template = await TournamentTemplate.create({
        name: 'Find Me',
        slug: 'find-me',
        mapTemplates: [activeMapTemplate._id],
      });

      const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}`);
      const response = await GET(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Find Me');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`);
      const response = await GET(request, { params: { id: nonExistentId } });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и возвращать 200', async () => {
      const template = await TournamentTemplate.create({
        name: 'Original Name',
        slug: 'original-name',
        mapTemplates: [activeMapTemplate._id],
      });
      const updateData = { name: 'Updated Name' };

      const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Updated Name');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${template._id}`);
    });

    it('должен возвращать 404, если шаблон для обновления не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Does not matter' }),
      });
      const response = await PATCH(request, { params: { id: nonExistentId } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      await TournamentTemplate.create({
        name: 'Existing Name',
        slug: 'existing-name',
        mapTemplates: [activeMapTemplate._id],
      });
      const templateToUpdate = await TournamentTemplate.create({
        name: 'My Name',
        slug: 'my-name',
        mapTemplates: [activeMapTemplate._id],
      });

      const request = new Request(`http://localhost/api/admin/tournament-templates/${templateToUpdate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      const response = await PATCH(request, { params: { id: templateToUpdate._id.toString() } });
      expect(response.status).toBe(409);
    });

    it('должен возвращать 404 при попытке обновить с несуществующим шаблоном карты', async () => {
      const template = await TournamentTemplate.create({
        name: 'Original Name For Map Test',
        slug: 'original-name-for-map-test',
        mapTemplates: [activeMapTemplate._id],
      });
      const nonExistentMapId = new mongoose.Types.ObjectId().toString();

      const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapTemplates: [nonExistentMapId] }),
      });
      
      const response = await PATCH(request, { params: { id: template._id.toString() } });
      expect(response.status).toBe(404);
    });
  });
});