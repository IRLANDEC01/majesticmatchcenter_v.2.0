import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';

const { Family, FamilyStats } = models;

describe('API /api/admin/families', () => {
  let testData;

  beforeAll(dbConnect);

  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb({ numPlayers: 3, numFamilies: 2 });
    testData = data;
  });

  describe('POST', () => {
    it('должен успешно создавать семью, назначать владельца и возвращать 201', async () => {
      // Arrange
      // Создадим нового игрока специально для этого теста, чтобы он точно был без семьи
      const newOwner = await models.Player.create({ firstName: 'NewOwner', lastName: 'Test' });
      const familyData = {
        name: 'The Champions',
        displayLastName: 'Champions',
        ownerId: newOwner._id.toString(),
      };
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
      expect(body.owner.toString()).toBe(newOwner._id.toString());

      const dbFamily = await Family.findById(body._id);
      expect(dbFamily).not.toBeNull();
      expect(dbFamily.owner.toString()).toBe(newOwner._id.toString());

      expect(dbFamily.members).toHaveLength(1);
      expect(dbFamily.members[0].player.toString()).toBe(newOwner._id.toString());
      expect(dbFamily.members[0].role).toBe('owner');

      const dbStats = await FamilyStats.findOne({ familyId: body._id });
      expect(dbStats).not.toBeNull();
    });

    it('должен возвращать ошибку 400, если не указан ownerId', async () => {
      // Arrange
      const invalidData = { name: 'The Champions', displayLastName: 'Champions' }; // Нет ownerId
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const body = await response.json();
      // Ошибка валидации Zod в route.js возвращает поле `error`
      expect(body.error).toBeDefined();
      const ownerIdError = body.error.ownerId._errors;
      expect(ownerIdError[0]).toContain('ID владельца является обязательным полем.');
    });

    it('должен возвращать ошибку 400, если игрок уже состоит в семье', async () => {
      // Arrange
      // Берем игрока, который УЖЕ состоит в семье
      const existingPlayerWithOwner = testData.playerGucci;

      const familyData = {
        name: 'Another Family',
        displayLastName: 'Another',
        ownerId: existingPlayerWithOwner._id.toString(),
      };
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(familyData),
      });

      // Act
      const response = await POST(request);

      // Assert
      // Ожидаем ошибку 400 из-за ValidationError от сервиса, который handleApiError превращает в { message: ... }
      expect(response.status).toBe(400); 
      const body = await response.json();
      expect(body.message).toContain('Игрок уже состоит в другой семье');
    });

    it('должен возвращать ошибку 409 при попытке создать дубликат', async () => {
      // Arrange: Используем данные из populateDb
      const existingFamily = testData.familyGucci;
      // Создаем нового игрока, который не состоит в семье
      const newOwner = await models.Player.create({ firstName: 'AnotherOwner', lastName: 'Test' });
      const request = new Request('http://localhost/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: existingFamily.name,
          displayLastName: existingFamily.displayLastName || existingFamily.name,
          ownerId: newOwner._id.toString(),
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
      const familyToArchive = testData.familyUzi;
      await Family.findByIdAndUpdate(familyToArchive._id, { archivedAt: new Date() });
      
      const request = new Request('http://localhost/api/admin/families');
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe(testData.familyGucci.name);
    });

    it('должен возвращать все семьи при `include_archived=true`', async () => {
      // Arrange: Архивируем одну из созданных семей
      const familyToArchive = testData.familyUzi;
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