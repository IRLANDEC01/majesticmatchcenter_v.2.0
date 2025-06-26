import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import { vi } from 'vitest';

// Мокируем 'next/cache' для всех тестов в этом файле
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const { Map, Tournament, MapTemplate } = models;

describe('/api/admin/maps', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb();
    testData = data;
  });

  describe('GET', () => {
    it('должен возвращать список карт', async () => {
      // Arrange: populateDb уже создал одну карту
      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe(testData.map.name);
    });
  });

  describe('POST', () => {
    it('должен успешно создавать карты с инкрементальным slug и возвращать 201', async () => {
      // Arrange
      const { tournament, mapTemplateDust2 } = testData;
      
      // Удаляем карту, созданную в populateDb, чтобы тест был чистым
      await Map.deleteMany({});

      // --- Создание первой карты ---
      const mapData1 = {
        name: 'First Test Map',
        tournament: tournament._id.toString(),
        template: mapTemplateDust2._id.toString(),
        startDateTime: new Date(),
      };

      const req1 = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData1),
      });

      const response1 = await POST(req1);
      const body1 = await response1.json();
      
      // Счетчик slug должен начаться с 1, так как мы очистили карты
      const expectedSlug1 = `${tournament.slug}-${mapTemplateDust2.slug}-1`;
      expect(response1.status).toBe(201);
      expect(body1.slug).toBe(expectedSlug1);

      // Проверяем, что revalidatePath была вызвана
      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournaments');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/maps');

      // --- Создание второй карты ---
      const mapData2 = {
        name: 'Second Test Map',
        tournament: tournament._id.toString(),
        template: mapTemplateDust2._id.toString(),
        startDateTime: new Date(),
      };
      
      const req2 = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData2),
      });

      const response2 = await POST(req2);
      const body2 = await response2.json();
      
      const expectedSlug2 = `${tournament.slug}-${mapTemplateDust2.slug}-2`;
      expect(response2.status).toBe(201);
      expect(body2.slug).toBe(expectedSlug2);
    });

    it('должен возвращать 400 при невалидных данных', async () => {
      // Arrange
      const newMapData = {
        name: 'Invalid Map',
        tournament: testData.tournament._id.toString(),
        // template отсутствует
      };

      const req = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapData),
      });

      // Act
      const response = await POST(req);
      
      // Assert
      expect(response.status).toBe(400);
    });
  });
}); 