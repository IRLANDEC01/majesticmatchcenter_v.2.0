import { GET, POST } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import MapTemplate from '@/models/map/MapTemplate';
import { revalidatePath } from 'next/cache';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  // --- POST Tests ---
  describe('POST', () => {
    const validTemplateData = {
      name: 'New Map Template',
      description: 'A test description',
      mapImage: '/placeholder.jpg',
    };

    it('должен успешно создавать шаблон карты и возвращать 201', async () => {
      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTemplateData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(validTemplateData.name);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

      const dbTemplate = await MapTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      await MapTemplate.create(validTemplateData);

      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTemplateData),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  // --- GET Tests ---
  describe('GET', () => {
    it('должен возвращать только активные шаблоны по умолчанию', async () => {
      await MapTemplate.create({ name: 'Active Map Template' });
      await MapTemplate.create({ name: 'Archived Map Template', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/map-templates');
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Active Map Template');
    });

    it('должен возвращать только архивные шаблоны при `status=archived`', async () => {
      await MapTemplate.create({ name: 'Active Map Template' });
      await MapTemplate.create({ name: 'Archived Map Template', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/map-templates?status=archived');
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0]).toHaveProperty('archivedAt');
    });
    
    it('должен возвращать шаблоны, соответствующие поисковому запросу', async () => {
      await MapTemplate.create([
        { name: 'Alpha Test Map' },
        { name: 'Bravo Test Map' },
        { name: 'Charlie Non-Matching' },
      ]);

      const request = new Request('http://localhost/api/admin/map-templates?q=Test');
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.length).toBe(2);
      expect(body.total).toBe(2);
    });
  });
});