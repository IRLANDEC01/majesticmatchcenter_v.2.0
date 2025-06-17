import { GET, PUT } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import models from '@/models';

describe('/api/admin/map-templates/[id]', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      MapTemplate.deleteMany({}),
      models.TournamentTemplate.deleteMany({}),
      models.Tournament.deleteMany({}),
    ]);
    testTemplate = await MapTemplate.create({ name: 'My Test Template', slug: 'my-test-template' });
  });

  describe('GET', () => {
    it('должен возвращать шаблон по ID и статус 200', async () => {
      const response = await GET(null, { params: { id: testTemplate._id.toString() } });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.name).toBe(testTemplate.name);
    });

    it('должен возвращать 404, если шаблон не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await GET(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять шаблон', async () => {
      const updateData = { name: 'Updated Template Name' };
      const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: testTemplate._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(updateData.name);

      const dbTemplate = await MapTemplate.findById(testTemplate._id);
      expect(dbTemplate.name).toBe(updateData.name);
    });

    it('должен возвращать 409 при дублировании имени', async () => {
      const anotherTemplate = await MapTemplate.create({ name: 'Another Template', slug: 'another-template' });
      const updateData = { name: 'My Test Template' }; // name, который уже есть у testTemplate

      const request = new Request(`http://localhost/api/admin/map-templates/${anotherTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const response = await PUT(request, { params: { id: anotherTemplate._id.toString() } });
      expect(response.status).toBe(409);
    });
  });
}); 