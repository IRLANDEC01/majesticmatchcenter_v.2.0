import { GET, PUT } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import mongoose from 'mongoose';

const { Tournament } = models;

describe('API /api/admin/tournaments/[id]', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('GET', () => {
    it('должен возвращать турнир по ID и статус 200', async () => {
      // Arrange
      const tournamentToFind = testData.tournament;
      
      // Act
      const response = await GET(null, { params: { id: tournamentToFind._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe(tournamentToFind.name);
    });

    it('должен возвращать 404, если турнир не найден', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Act
      const response = await GET(null, { params: { id: nonExistentId.toString() } });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять турнир', async () => {
      // Arrange
      const tournamentToUpdate = testData.tournament;
      const updateData = { name: 'Updated Tournament Name' };
      const request = new Request(`http://localhost/api/admin/tournaments/${tournamentToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: tournamentToUpdate._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe(updateData.name);
    });

    it('должен возвращать 404 при попытке обновить несуществующий турнир', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Does not matter' }),
      });
      
      // Act
      const response = await PUT(request, { params: { id: nonExistentId.toString() } });
      
      // Assert
      expect(response.status).toBe(404);
    });
  });
}); 