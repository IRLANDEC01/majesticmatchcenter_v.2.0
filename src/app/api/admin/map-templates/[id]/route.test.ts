import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PATCH } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import { revalidatePath } from 'next/cache';
import { dbClear } from '@/lib/test-helpers';
import { HydratedDocument } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('API /api/admin/map-templates/[id]', () => {
  let template: HydratedDocument<IMapTemplate>;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();
    template = await MapTemplate.create({
      name: 'Test Map',
      description: 'A map for testing',
      mapTemplateImage: 'path/to/image.jpg',
    });
  });

  describe('GET', () => {
    it('должен возвращать один шаблон по ID', async () => {
      const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`);
      const response = await GET(request, { params: { id: template._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Test Map');
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      const nonExistentId = '605c72a6b579624e50a9d8e1';
      const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}`);
      const response = await GET(request, { params: { id: nonExistentId } });
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять шаблон и вызывать revalidatePath', async () => {
      const updateData = { name: 'Updated Name', description: 'Updated description' };
      const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: template._id.toString() } });
      const dbTemplate = await MapTemplate.findById(template._id);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe(updateData.name);
      expect(dbTemplate!.name).toBe(updateData.name);

      expect(revalidatePath).toHaveBeenCalledTimes(2);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${template._id.toString()}/edit`);
    });

    it('должен возвращать 409 (Conflict) при дублировании имени', async () => {
      await MapTemplate.create({ name: 'Existing Name', mapTemplateImage: 'path/to/image.jpg' });
      const templateToUpdate = await MapTemplate.create({
        name: 'Initial Name',
        mapTemplateImage: 'path/to/image.jpg',
      });
      const updateData = { name: 'Existing Name' };
      const request = new Request(`http://localhost/api/admin/map-templates/${templateToUpdate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: templateToUpdate._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(body.message).toContain('уже существует');
    });

    describe('Validation', () => {
      it('должен возвращать 400, если название слишком короткое', async () => {
        // Arrange
        const template = await MapTemplate.create({
          name: 'Initial Name',
          mapTemplateImage: 'path/to/image.jpg',
        });
        const updateData = { name: 'a' }; // Невалидное имя
        const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        // Act
        const response = await PATCH(request, { params: { id: template._id.toString() } });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(body.errors.name).toBeDefined();
        expect(revalidatePath).not.toHaveBeenCalled();
      });

      it('должен возвращать 400, если изображение карты - пустая строка', async () => {
        // Arrange
        const template = await MapTemplate.create({
          name: 'Initial Name',
          mapTemplateImage: 'path/to/image.jpg',
        });
        const updateData = { mapTemplateImage: '' }; // Невалидное значение
        const request = new Request(`http://localhost/api/admin/map-templates/${template._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        // Act
        const response = await PATCH(request, { params: { id: template._id.toString() } });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(body.errors.mapTemplateImage).toBeDefined();
        expect(revalidatePath).not.toHaveBeenCalled();
      });
    });
  });
}); 