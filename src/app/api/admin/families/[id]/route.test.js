import { describe, it, expect, beforeEach, vi, afterAll, beforeAll } from 'vitest';
import { GET, PUT, DELETE } from './route';
import { dbClear, populateDb } from '@/lib/test-helpers';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

// Мокируем внешние зависимости
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('API /api/admin/families/[id]', () => {
  let testData;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();
    const { family, player } = await populateDb({ numFamilies: 1, numPlayers: 1 });
    testData = { family, player };
  });

  describe('GET', () => {
    it('должен возвращать семью по ID и статус 200', async () => {
      // Arrange
      const family = await Family.create({ name: 'Test Family', displayLastName: 'Test', owner: testData.player._id });
      const request = new Request(`http://localhost/api/admin/families/${family._id}`);

      // Act
      const response = await GET(request, { params: { id: family._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.name).toBe(family.name);
    });

    it('должен возвращать 404, если семья не найдена', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/families/${nonExistentId}`);
      
      // Act
      const response = await GET(request, { params: { id: nonExistentId.toString() } });

      // Assert
      expect(response.status).toBe(404);
    });

    it('должен возвращать 404, если семья архивирована', async () => {
      // Arrange
      const family = await Family.create({ name: 'Archived Family', displayLastName: 'Archived', owner: testData.player._id, archivedAt: new Date() });
      const request = new Request(`http://localhost/api/admin/families/${family._id}`);
      
      // Act
      const response = await GET(request, { params: { id: family._id.toString() } });

      // Assert
      expect(response.status).toBe(404);
    });

    it('должен возвращать 400 при невалидном ID', async () => {
      // Act
      const request = new Request(`http://localhost/api/admin/families/invalid-id`);
      const response = await GET(request, { params: { id: 'invalid-id' } });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять семью и вызывать revalidatePath', async () => {
      // Arrange
      const family = await Family.create({ name: 'Original Name', displayLastName: 'Original', owner: testData.player._id });
      const updateData = { description: 'A new description' };
      const request = new Request(`http://localhost/api/admin/families/${family._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PUT(request, { params: { id: family._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.description).toBe(updateData.description);
      
      expect(revalidatePath).toHaveBeenCalledWith('/admin/families');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/families/${family._id}`);
      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      // Arrange
      await Family.create({ name: 'Existing Name', displayLastName: 'Existing', owner: testData.player._id });
      const familyToUpdate = await Family.create({ name: 'Original Name', displayLastName: 'Original', owner: testData.player._id });

      const request = new Request(`http://localhost/api/admin/families/${familyToUpdate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      
      // Act
      const response = await PUT(request, { params: { id: familyToUpdate._id.toString() } });
      
      // Assert
      expect(response.status).toBe(409);
    });
  });
});