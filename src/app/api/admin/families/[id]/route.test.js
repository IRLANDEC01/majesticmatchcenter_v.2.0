import { GET, PUT } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import mongoose from 'mongoose';

const { Family } = models;

describe('/api/admin/families/[id]', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb();
    testData = data;
  });

  describe('GET', () => {
    it('должен возвращать семью по ID и статус 200', async () => {
      // Arrange
      const familyToFind = testData.family;

      // Act
      const response = await GET(null, { params: { id: familyToFind._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe(familyToFind.name);
    });

    it('должен возвращать 404, если семья не найдена', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Act
      const response = await GET(null, { params: { id: nonExistentId.toString() } });

      // Assert
      expect(response.status).toBe(404);
    });

    it('должен возвращать 404, если семья архивирована', async () => {
      // Arrange
      const familyToArchive = testData.family;
      await Family.findByIdAndUpdate(familyToArchive._id, { archivedAt: new Date() });
      
      // Act
      const response = await GET(null, { params: { id: familyToArchive._id.toString() } });

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
    it('должен успешно обновлять семью и возвращать статус 200', async () => {
      // Arrange
      const familyToUpdate = testData.family;
      const updateData = { description: 'A new description for testing' };
      const request = new Request(`http://localhost/api/admin/families/${familyToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: familyToUpdate._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.description).toBe(updateData.description);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      // Arrange
      const familyToUpdate = testData.familyUzi;
      const conflictingFamily = testData.familyGucci;

      const request = new Request(`http://localhost/api/admin/families/${familyToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: conflictingFamily.name }),
      });
      
      // Act
      const response = await PUT(request, { params: { id: familyToUpdate._id.toString() } });
      
      // Assert
      expect(response.status).toBe(409);
    });
  });
}); 