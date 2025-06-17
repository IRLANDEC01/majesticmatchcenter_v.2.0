import { GET, POST } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('/api/admin/map-templates', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await MapTemplate.deleteMany({});
  });

  describe('GET', () => {
    it('должен возвращать список шаблонов карт и статус 200', async () => {
      await MapTemplate.create([
        { name: 'Test Template 1' },
        { name: 'Test Template 2' },
      ]);
      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
    });
  });

  describe('POST', () => {
    it('должен создавать шаблон и возвращать его со статусом 201', async () => {
      const newTemplateData = { name: 'New Awesome Template', slug: 'new-awesome-template' };
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplateData),
      });
      const response = await POST(request);
      const body = await response.json();
      expect(response.status).toBe(201);
      expect(body.name).toBe(newTemplateData.name);
      
      const dbTemplate = await MapTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать ошибку 409 при дубликате', async () => {
      await MapTemplate.create({ name: 'Existing Template', slug: 'existing-template' });
      const newTemplateData = { name: 'Existing Template', slug: 'existing-template' };
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplateData),
      });
      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });
}); 