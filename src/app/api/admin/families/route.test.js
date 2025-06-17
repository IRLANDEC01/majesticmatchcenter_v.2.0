import { createMocks } from 'node-mocks-http';
import { GET, POST } from './route';
import Family from '@/models/family/Family';

describe('API /api/admin/families', () => {
  beforeAll(async () => {
    await Family.init();
  });

  describe('POST', () => {
    it('должен успешно создавать семью и возвращать статус 201', async () => {
      const familyData = { name: 'The Champions', displayLastName: 'Champions' };

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: familyData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(familyData.name);
      const expectedSlug = 'the-champions';
      expect(body.slug).toBe(expectedSlug);

      const dbFamily = await Family.findById(body._id);
      expect(dbFamily).not.toBeNull();
      if (dbFamily) {
        expect(dbFamily.name).toBe(familyData.name);
      }
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      const invalidData = { name: 'Missing DisplayName' };

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: invalidData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.displayLastName).toBeDefined();
    });

    it('должен возвращать ошибку 409 при попытке создать дубликат', async () => {
      const familyData = { name: 'The Duplicates', displayLastName: 'Duplicates' };
      await new Family(familyData).save();

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: familyData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toContain('уже существует');
    });
  });

  describe('GET', () => {
    it('должен возвращать пустой массив, если семей нет', async () => {
      const { req } = createMocks({
        method: 'GET',
      });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    it('должен возвращать только неархивированные семьи по умолчанию', async () => {
      await new Family({ name: 'Active Family', displayLastName: 'Active' }).save();
      const archivedFamily = await new Family({ name: 'Archived Family', displayLastName: 'Archived' }).save();
      archivedFamily.archivedAt = new Date();
      await archivedFamily.save();

      const { req } = createMocks({
        method: 'GET',
      });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toContain('Active Family');
    });

    it('должен возвращать все семьи при `include_archived=true`', async () => {
      await new Family({ name: 'First Family', displayLastName: 'First' }).save();
      const archivedFamily = await new Family({ name: 'Second Family', displayLastName: 'Second' }).save();
      archivedFamily.archivedAt = new Date();
      await archivedFamily.save();

      const { req } = createMocks({
        method: 'GET',
        query: {
          include_archived: 'true',
        },
      });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 