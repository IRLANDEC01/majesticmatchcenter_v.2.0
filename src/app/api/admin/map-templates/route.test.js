import { GET, POST } from './route';
import MapTemplate from '@/models/map/MapTemplate';

describe('/api/admin/map-templates', () => {
  beforeAll(async () => {
    await MapTemplate.init();
  });

  describe('GET', () => {
    it('должен возвращать список шаблонов карт и статус 200', async () => {
      await MapTemplate.create({ name: 'Test Map' });
      await MapTemplate.create({ name: 'Another Map' });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
    });

    it('должен возвращать пустой массив, если шаблонов нет', async () => {
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('POST', () => {
    it('должен создавать шаблон и возвращать его со статусом 201', async () => {
      const newTemplateData = { name: 'New Awesome Map' };
      
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

    it('должен возвращать ошибку 400 при невалидных данных (пустое имя)', async () => {
      const invalidData = { name: '' }; 

      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.name).toBeDefined();
    });
    
    it('должен возвращать ошибку 409 при дубликате', async () => {
      const templateData = { name: 'Duplicate Map' };
      await MapTemplate.create(templateData);

      const request = new Request('http://localhost/api/admin/map-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toBe('Шаблон карты с таким названием уже существует');
    });
  });
}); 