import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';

const { Player, PlayerStats } = models;

describe('API /api/admin/players', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('POST', () => {
    it('должен успешно создавать игрока, связанную статистику и возвращать 201', async () => {
      // Arrange
      const playerData = { firstName: 'New', lastName: 'Player' };
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.firstName).toBe(playerData.firstName);
      
      const dbPlayer = await Player.findById(body._id);
      expect(dbPlayer).not.toBeNull();
      
      const dbStats = await PlayerStats.findOne({ playerId: body._id });
      expect(dbStats).not.toBeNull();
    });

    it('должен возвращать 409 при попытке создать дубликат по имени и фамилии', async () => {
      // Arrange: Используем данные, созданные в populateDb
      const existingPlayer = testData.players[0];
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: existingPlayer.firstName,
          lastName: existingPlayer.lastName,
        }),
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированных игроков по умолчанию', async () => {
      // Arrange: Архивируем одного из созданных игроков
      const playerToArchive = testData.players[1];
      await Player.findByIdAndUpdate(playerToArchive._id, { archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/players');
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // populateDb создает 2 игроков, одного мы архивировали, должен остаться 1
      expect(body.length).toBe(1);
      expect(body[0].firstName).toBe(testData.players[0].firstName);
    });

    it('должен возвращать всех игроков при `include_archived=true`', async () => {
      // Arrange: Архивируем одного игрока
      const playerToArchive = testData.players[1];
      await Player.findByIdAndUpdate(playerToArchive._id, { archivedAt: new Date() });

      const url = new URL('http://localhost/api/admin/players');
      url.searchParams.set('include_archived', 'true');
      const request = new Request(url);
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Должны вернуться оба игрока, созданные в populateDb
      expect(body.length).toBe(2);
    });
  });
}); 