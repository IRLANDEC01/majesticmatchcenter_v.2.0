import { GET, PUT, DELETE } from './route';
import Family from '@/models/family/Family';
import mongoose from 'mongoose';

describe('/api/admin/families/[id]', () => {
  beforeAll(async () => {
    await Family.init();
  });

  // GET Tests
  describe('GET', () => {
    it('должен возвращать семью по ID и статус 200', async () => {
      const testFamily = await Family.create({ name: 'Test Family GET', displayLastName: 'Test' });
      const response = await GET(null, { params: { id: testFamily._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(testFamily.name);
    });

    it('должен возвращать 404, если семья не найдена', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await GET(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать 200, даже если семья неактивна', async () => {
      const testFamily = await Family.create({ name: 'Inactive Family GET', displayLastName: 'Test', status: 'inactive' });
      const response = await GET(null, { params: { id: testFamily._id.toString() } });
      expect(response.status).toBe(200);
    });

    it('должен возвращать 400 при невалидном ID', async () => {
      const response = await GET(null, { params: { id: 'invalid-id' } });
      expect(response.status).toBe(400);
    });
  });

  // PUT Tests
  describe('PUT', () => {
    it('должен успешно обновлять семью и возвращать статус 200', async () => {
      const testFamily = await Family.create({ name: 'Test Family PUT', displayLastName: 'Test' });
      const updateData = { description: 'A new description' };
      const request = new Request(`http://localhost/api/admin/families/${testFamily._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: testFamily._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.description).toBe('A new description');
    });

    it('должен возвращать 404 при попытке обновить несуществующую семью', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/families/${nonExistentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      const response = await PUT(request, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      const family1 = await Family.create({ name: 'Family One', displayLastName: 'One' });
      const family2 = await Family.create({ name: 'Family Two', displayLastName: 'Two' });

      const request = new Request(`http://localhost/api/admin/families/${family2._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Family One' }), // Try to use family1's name
      });
      
      const response = await PUT(request, { params: { id: family2._id.toString() } });
      expect(response.status).toBe(409);
    });
  });

  // DELETE Tests
  describe('DELETE', () => {
    it('должен деактивировать семью и возвращать статус 200', async () => {
      const testFamily = await Family.create({ name: 'Test Family DELETE', displayLastName: 'Test' });
      const response = await DELETE(null, { params: { id: testFamily._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('inactive');

      const dbFamily = await Family.findById(testFamily._id);
      expect(dbFamily).not.toBeNull();
      if (dbFamily) {
        expect(dbFamily.status).toBe('inactive');
      }
    });

    it('должен возвращать 404 при попытке деактивировать несуществующую семью', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await DELETE(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });
  });
}); 