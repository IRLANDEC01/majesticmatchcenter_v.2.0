import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import { revalidatePath } from 'next/cache';
import { dbClear } from '@/lib/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('API /api/admin/map-templates', () => {
  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();
  });

  describe('POST', () => {
    it('должен успешно создавать шаблон, генерировать slug и возвращать 201', async () => {
      // Arrange
      const templateData = {
        name: 'New Unique Template',
        description: 'Description',
        mapTemplateImage: 'path/to/image.jpg',
      };
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe(templateData.name);
      expect(body.slug).toBe('new-unique-template');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

      const dbTemplate = await MapTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
      expect(dbTemplate!.slug).toBe('new-unique-template');
    });

    it('должен возвращать 409 при попытке создать дубликат имени', async () => {
      // Arrange
      await MapTemplate.create({ name: 'Existing Template', mapTemplateImage: 'path/to/image.jpg' });
      const requestBody = { name: 'Existing Template', mapTemplateImage: 'path/to/new.jpg' };
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(body.message).toContain('уже существует');
    });

    describe('Validation', () => {
      it('должен возвращать 400, если название слишком короткое', async () => {
        const requestBody = { name: 'a', mapTemplateImage: 'path/to/image.jpg' };
        const request = new Request('http://localhost/api/admin/map-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errors.name).toBeDefined();
      });

      it('должен возвращать 400, если не предоставлено изображение карты', async () => {
        const requestBody = { name: 'Test Map' };
        const request = new Request('http://localhost/api/admin/map-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errors.mapTemplateImage).toBeDefined();
      });
    });
  });

  describe('GET', () => {
    it('должен возвращать только активные шаблоны по умолчанию', async () => {
      // Arrange
      await MapTemplate.create({
        name: 'Active Template 1',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Archived Template 1',
        mapTemplateImage: 'path/to/image.jpg',
        archivedAt: new Date(),
      });

      const request = new Request('http://localhost/api/admin/map-templates');
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Active Template 1');
    });

    it('должен возвращать только архивные шаблоны при `status=archived`', async () => {
      // Arrange
      await MapTemplate.create({
        name: 'Active Template 1',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Archived Template 1',
        mapTemplateImage: 'path/to/image.jpg',
        archivedAt: new Date(),
      });

      const request = new Request('http://localhost/api/admin/map-templates?status=archived');
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Archived Template 1');
    });

    it('должен возвращать шаблоны, соответствующие поисковому запросу', async () => {
      // Arrange
      await MapTemplate.create({
        name: 'Searchable Template 1',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Searchable Template 2',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Other Template',
        mapTemplateImage: 'path/to/image.jpg',
      });

      const request = new Request('http://localhost/api/admin/map-templates?q=Searchable');
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
      expect(body.total).toBe(2);
    });
  });
}); 