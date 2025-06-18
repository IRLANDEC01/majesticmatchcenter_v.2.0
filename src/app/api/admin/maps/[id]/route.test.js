import { GET, PUT } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import mongoose from 'mongoose';

const { Map } = models;

describe('/api/admin/maps/[id]', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('GET', () => {
    it('должен возвращать карту по ID', async () => {
      // Arrange
      const mapToFind = testData.map;

      // Act
      const response = await GET(null, { params: { id: mapToFind._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe(mapToFind.name);
    });

    it('должен возвращать 404, если карта не найдена', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();

      // Act
      const response = await GET(null, { params: { id: nonExistentId.toString() } });

      // Assert
      expect(response.status).toBe(404);
    });

    it('должен возвращать 400 при невалидном ID', async () => {
      // Act
      const response = await GET(null, { params: { id: 'invalid-id' } });
      
      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять карту', async () => {
      // Arrange
      const mapToUpdate = testData.map;
      const updateData = {
        name: 'Updated Map Name',
      };
      const req = new Request(`http://localhost/api/admin/maps/${mapToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(req, { params: { id: mapToUpdate._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe(updateData.name);
    });
  });
}); 