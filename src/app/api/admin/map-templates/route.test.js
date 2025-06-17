import { GET, POST } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/map-templates', () => {
  beforeAll(async () => {
    await connectToDatabase();
    await MapTemplate.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await MapTemplate.deleteMany({});
  });

  describe('POST', () => {
    it('должен успешно создавать шаблон карты и возвращать 201', async () => {
      const templateData = { name: 'New Map Template' };
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(templateData.name);
      expect(body.slug).toBe('new-map-template');
      
      const dbTemplate = await MapTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      const templateData = { name: 'Duplicate Map Template' };
      await MapTemplate.create(templateData);

      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные шаблоны по умолчанию', async () => {
      await MapTemplate.create({ name: 'Active Map Template' });
      await MapTemplate.create({ name: 'Archived Map Template', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/map-templates');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('Active Map Template');
    });

    it('должен возвращать все шаблоны при `include_archived=true`', async () => {
      await MapTemplate.create({ name: 'Active Map Template 2' });
      await MapTemplate.create({ name: 'Archived Map Template 2', archivedAt: new Date() });

      const url = new URL('http://localhost/api/admin/map-templates');
      url.searchParams.set('include_archived', 'true');
      const request = new Request(url);
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 