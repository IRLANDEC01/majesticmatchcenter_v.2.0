import { GET, POST } from './route';
import Family from '@/models/family/Family';
import FamilyStats from '@/models/family/FamilyStats';
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';

describe('API /api/admin/families', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await Family.init(); // Пересоздаем индексы после очистки
    await FamilyStats.init();
  });

  describe('POST', () => {
    it('должен успешно создавать семью и связанную статистику, и возвращать 201', async () => {
      const familyData = { name: 'The Champions', displayLastName: 'Champions' };

      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(familyData.name);
      
      const dbFamily = await Family.findById(body._id);
      expect(dbFamily).not.toBeNull();
      
      // Проверяем, что создался документ статистики
      const dbStats = await FamilyStats.findOne({ familyId: body._id });
      expect(dbStats).not.toBeNull();
      if (dbStats) {
        expect(dbStats.familyId.toString()).toBe(body._id.toString());
        expect(dbStats.overall.mapsPlayed).toBe(0);
      }
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      const invalidData = { name: 'Missing DisplayName' };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('должен возвращать ошибку 409 при попытке создать дубликат', async () => {
      const familyData = { name: 'The Duplicates', displayLastName: 'Duplicates' };
      await new Family(familyData).save();
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      const response = await POST(request);
      const body = await response.json();
      expect(response.status).toBe(409);
      expect(body.message).toContain('уже существует');
    });
  });

  describe('GET', () => {
    it('должен возвращать пустой массив, если семей нет', async () => {
      const request = new Request('http://localhost/api/admin/families');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    it('должен возвращать только неархивированные семьи по умолчанию', async () => {
      await Family.create({ name: 'Active Family', displayLastName: 'Active' });
      await Family.create({ name: 'Archived Family', displayLastName: 'Archived', archivedAt: new Date() });
      
      const request = new Request('http://localhost/api/admin/families');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toContain('Active Family');
    });

    it('должен возвращать все семьи при `include_archived=true`', async () => {
      await Family.create({ name: 'First Family', displayLastName: 'First' });
      await Family.create({ name: 'Second Family', displayLastName: 'Second', archivedAt: new Date() });
      
      const request = new Request('http://localhost/api/admin/families?include_archived=true');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 