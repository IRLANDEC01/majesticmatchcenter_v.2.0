import { GET, PUT } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import mongoose from 'mongoose';

const { Player } = models;

describe('/api/admin/players/[id]', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb();
    testData = data;
  });

  describe('GET', () => {
    it('должен возвращать игрока по ID и статус 200', async () => {
      // Arrange
      const playerToFind = testData.player;
      
      // Act
      const response = await GET(null, { params: { id: playerToFind._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.firstName).toBe(playerToFind.firstName);
    });

    it('должен возвращать 404, если игрок не найден', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();

      // Act
      const response = await GET(null, { params: { id: nonExistentId.toString() } });

      // Assert
      expect(response.status).toBe(404);
    });

    it('должен возвращать 404, если игрок архивирован', async () => {
      // Arrange
      const playerToArchive = testData.player;
      await Player.findByIdAndUpdate(playerToArchive._id, { archivedAt: new Date() });

      // Act
      const response = await GET(null, { params: { id: playerToArchive._id.toString() } });
      
      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять игрока', async () => {
      // Arrange
      const playerToUpdate = testData.player;
      const updateData = { bio: 'A new bio for testing' };
      const request = new Request(`http://localhost/api/admin/players/${playerToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: playerToUpdate._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.bio).toBe(updateData.bio);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      // Arrange
      const playerToUpdate = testData.playerUzi;
      const conflictingPlayer = testData.playerGucci;

      const request = new Request(`http://localhost/api/admin/players/${playerToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: conflictingPlayer.firstName, 
          lastName: conflictingPlayer.lastName 
        }),
      });
      
      // Act
      const response = await PUT(request, { params: { id: playerToUpdate._id.toString() } });

      // Assert
      expect(response.status).toBe(409);
    });
  });
}); 