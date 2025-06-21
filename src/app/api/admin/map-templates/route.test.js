import { GET, POST } from './route';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { dbClear } from '@/lib/test-helpers';
import { MAP_MODES, MAP_VISIBILITY } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await dbClear();
    // Очищаем мок перед каждым тестом
    revalidatePath.mockClear();
  });

  // --- POST Tests ---
  describe('POST', () => {
    const validTemplateData = {
      name: 'New Map Template',
      description: 'A test description',
      mapImage: '/placeholders/default-map.jpg',
    };

    it('должен успешно создавать шаблон карты и возвращать 201', async () => {
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTemplateData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(validTemplateData.name);

      // Проверяем, что revalidatePath была вызвана с правильным путем
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

      const dbTemplate = await MapTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      await MapTemplate.create(validTemplateData);

      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTemplateData),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      // Убедимся, что revalidatePath не была вызвана при ошибке
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('должен возвращать ошибку 400, если не предоставлено изображение карты', async () => {
      const { name, description } = validTemplateData;
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }), // Отправляем без mapImage
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.mapImage).toBeDefined();

      // Убедимся, что revalidatePath не была вызвана при ошибке валидации
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  // --- GET Tests ---
  describe('GET', () => {
    it('должен возвращать все шаблоны карт', async () => {
      await MapTemplate.create([
        { name: 'DM-SomeMap1', description: 'Test desc 1' },
        { name: 'DM-SomeMap2', description: 'Test desc 2' },
      ]);

      const request = new Request('http://localhost/api/admin/map-templates');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(2);
      expect(data.map(t => t.name)).toEqual(
        expect.arrayContaining(['DM-SomeMap1', 'DM-SomeMap2'])
      );
    });

    it('должен возвращать шаблоны, соответствующие поисковому запросу', async () => {
      await MapTemplate.create([
        { name: 'Test Arena', description: 'Desc 1' },
        { name: 'Another Map', description: 'Desc 2' },
        { name: 'Test Ground', description: 'Desc 3' },
      ]);
      
      const request = new Request('http://localhost/api/admin/map-templates?search=Test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(2);
      expect(data.every(t => t.name.includes('Test'))).toBe(true);
    });

    it('должен возвращать один шаблон по ID', async () => {
      const template1 = await MapTemplate.create({ name: 'FindMe', description: 'Desc 1' });
      await MapTemplate.create({ name: 'NotMe', description: 'Desc 2' });

      const request = new Request(`http://localhost/api/admin/map-templates?id=${template1._id}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('FindMe');
      expect(data[0]._id.toString()).toBe(template1._id.toString());
    });
    
    it('должен возвращать только неархивированные шаблоны по умолчанию', async () => {
      await MapTemplate.create({ name: 'Active Map Template' });
      await MapTemplate.create({ name: 'Archived Map Template', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/map-templates');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('Active Map Template');
    });

    it('должен возвращать все шаблоны при `include_archived=true`', async () => {
      await MapTemplate.create({ name: 'Active Map Template 2' });
      await MapTemplate.create({ name: 'Archived Map Template 2', archivedAt: new Date() });
      
      const request = new Request('http://localhost/api/admin/map-templates?include_archived=true');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 