import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';

const { Family, FamilyStats } = models;

describe('API /api/admin/families', () => {
  let testData;

  beforeAll(dbConnect);

  afterAll(dbDisconnect);

  beforeEach(async () => {
    // Используем dbClear вместо clearDatabase и populateDb для создания данных
    await dbClear();
    testData = await populateDb();
  });

  describe('POST', () => {
    it('должен успешно создавать семью и связанную статистику, и возвращать 201', async () => {
      // Arrange
      const familyData = { name: 'The Champions', displayLastName: 'Champions' };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe(familyData.name);
      
      const dbFamily = await Family.findById(body._id);
      expect(dbFamily).not.toBeNull();
      
      const dbStats = await FamilyStats.findOne({ familyId: body._id });
      expect(dbStats).not.toBeNull();
      if (dbStats) {
        expect(dbStats.familyId.toString()).toBe(body._id.toString());
        expect(dbStats.overall.mapsPlayed).toBe(0);
      }
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      // Arrange
      const invalidData = { name: 'Missing DisplayName' };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('должен возвращать ошибку 409 при попытке создать дубликат', async () => {
      // Arrange: Используем данные из populateDb
      const existingFamily = testData.families[0];
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: existingFamily.name,
          displayLastName: existingFamily.displayLastName || existingFamily.name,
        }),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(body.message).toContain('уже существует');
    });
  });

  describe('GET', () => {
    it('должен возвращать все неархивированные семьи', async () => {
      // Arrange: populateDb уже создала 2 семьи. Архивируем одну.
      const familyToArchive = testData.families[1];
      await Family.findByIdAndUpdate(familyToArchive._id, { archivedAt: new Date() });
      
      const request = new Request('http://localhost/api/admin/families');
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe(testData.families[0].name);
    });

    it('должен возвращать все семьи при `include_archived=true`', async () => {
      // Arrange: Архивируем одну из созданных семей
      const familyToArchive = testData.families[1];
      await Family.findByIdAndUpdate(familyToArchive._id, { archivedAt: new Date() });
      
      const request = new Request('http://localhost/api/admin/families?include_archived=true');

      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });

    it('должен возвращать пустой массив, если все семьи архивированы', async () => {
      // Arrange: Архивируем все, что создано
      await Family.updateMany({}, { $set: { archivedAt: new Date() } });

      const request = new Request('http://localhost/api/admin/families');

      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });
}); 