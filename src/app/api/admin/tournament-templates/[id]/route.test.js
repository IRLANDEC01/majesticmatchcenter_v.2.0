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
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  describe('GET', () => {
    it('должен успешно находить и возвращать шаблон по ID', async () => {
      // Arrange
      const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
      const template = await TournamentTemplate.create({
        name: 'Find Me',
        mapTemplates: [mapTemplate._id],
      });

      // Act
      const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}`);
      const response = await GET(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe('Find Me');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`);
      
      // Act
      const response = await GET(request, { params: { id: nonExistentId } });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон, вызывать revalidate и возвращать 200', async () => {
      // Arrange
      const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
      const template = await TournamentTemplate.create({
        name: 'Original Name',
        slug: 'original-name',
        mapTemplates: [mapTemplate._id],
      });
      const updateData = { name: 'Updated Name' };

      const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PATCH(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe('Updated Name');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/edit/${template.slug}`);
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });

    it('должен возвращать 404, если шаблон для обновления не найден', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Does not matter' }),
      });

      // Act
      const response = await PATCH(request, { params: { id: nonExistentId } });
      
      // Assert
      expect(response.status).toBe(404);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      // Arrange
      const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
      await TournamentTemplate.create({
        name: 'Existing Name',
        slug: 'existing-name',
        mapTemplates: [mapTemplate._id],
      });
      const templateToUpdate = await TournamentTemplate.create({
        name: 'My Name',
        slug: 'my-name',
        mapTemplates: [mapTemplate._id],
      });

      const request = new Request(`http://localhost/api/admin/tournament-templates/${templateToUpdate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Existing Name' }),
      });

      // Act
      const response = await PATCH(request, { params: { id: templateToUpdate._id.toString() } });
      
      // Assert
      expect(response.status).toBe(409);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('должен возвращать 404 при попытке обновить с несуществующим шаблоном карты', async () => {
      // Arrange
      const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
      const template = await TournamentTemplate.create({
        name: 'Original Name For Map Test',
        mapTemplates: [mapTemplate._id],
      });
      const nonExistentMapId = new mongoose.Types.ObjectId().toString();

      const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapTemplates: [nonExistentMapId] }),
      });
      
      // Act
      const response = await PATCH(request, { params: { id: template._id.toString() } });

      // Assert
      expect(response.status).toBe(404);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});