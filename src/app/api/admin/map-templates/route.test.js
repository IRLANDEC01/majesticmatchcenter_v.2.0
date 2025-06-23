import { GET, POST } from './route.js';
import { dbClear } from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate.ts';
import { revalidatePath } from 'next/cache';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates', () => {
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
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
      expect(dbTemplate.slug).toBe('new-unique-template');
    });

    it('должен возвращать 409 при попытке создать дубликат имени', async () => {
      // Arrange
      const existingTemplateData = {
        name: 'Existing Template',
        slug: 'existing-template',
        description: 'This is already in the db',
        mapTemplateImage: 'path/to/image.jpg',
      };
      await MapTemplate.create(existingTemplateData);

      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...existingTemplateData, slug: 'new-slug' }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(409);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('должен возвращать только активные шаблоны по умолчанию', async () => {
      // Arrange
      await MapTemplate.create({
        name: 'Active Template 1',
        slug: 'active-1',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Archived Template 1',
        slug: 'archived-1',
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
        slug: 'active-1',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Archived Template 1',
        slug: 'archived-1',
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
        slug: 'search-1',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Searchable Template 2',
        slug: 'search-2',
        mapTemplateImage: 'path/to/image.jpg',
      });
      await MapTemplate.create({
        name: 'Other Template',
        slug: 'other',
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