import { GET, PATCH } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import models from '@/models';
import { dbClear } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('/api/admin/map-templates/[id]', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await dbClear();
    testTemplate = await MapTemplate.create({
      name: 'Initial Name',
      description: 'Initial description',
      mapImage: '/placeholders/default-map.jpg',
    });
    // Очищаем мок перед каждым тестом
    revalidatePath.mockClear();
  });

  describe('GET', () => {
    it('должен возвращать один шаблон по ID', async () => {
      const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}`);
      const response = await GET(request, { params: { id: testTemplate._id } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(testTemplate.name);
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

      const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: testTemplate._id } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(updateData.name);

      // Проверяем, что revalidatePath была вызвана
      expect(revalidatePath).toHaveBeenCalledTimes(1);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

      const dbTemplate = await MapTemplate.findById(testTemplate._id);
      expect(dbTemplate.name).toBe(updateData.name);
    });

    it('не должен вызывать revalidatePath при ошибке', async () => {
      // Создаем еще один шаблон, чтобы спровоцировать ошибку уникальности
      await MapTemplate.create({ name: 'Existing Name', description: 'desc' });
      const updateData = { name: 'Existing Name' };

      const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const response = await PATCH(request, { params: { id: testTemplate._id } });

      expect(response.status).toBe(409); // Conflict

      // Проверяем, что revalidatePath не была вызвана
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
}); 