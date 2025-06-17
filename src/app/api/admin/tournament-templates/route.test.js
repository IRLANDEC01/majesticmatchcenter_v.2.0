import { createMocks } from 'node-mocks-http';
import { GET, POST } from './route';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';

describe('/api/admin/tournament-templates', () => {
  let mapTemplate;

  beforeAll(async () => {
    await TournamentTemplate.init();
    await MapTemplate.init(); // Инициализируем зависимую модель
  });

  beforeEach(async () => {
    // Создаем шаблон карты, который будем использовать в тестах
    mapTemplate = await MapTemplate.create({ name: 'Test Map for Tournament' });
  });

  describe('GET', () => {
    it('должен возвращать список шаблонов и статус 200', async () => {
      await TournamentTemplate.create({ name: 'Test Template', mapTemplates: [mapTemplate._id] });
      await TournamentTemplate.create({ name: 'Another Template', mapTemplates: [mapTemplate._id] });
      
      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
    });

    it('должен возвращать пустой массив, если шаблонов нет', async () => {
      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('POST', () => {
    it('должен создавать шаблон и возвращать его со статусом 201', async () => {
      const newTemplateData = { 
        name: 'Super Tournament',
        mapTemplates: [mapTemplate._id.toString()] 
      };

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: newTemplateData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toEqual(newTemplateData.name);

      const dbTemplate = await TournamentTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
    });

    it('должен возвращать ошибку 400 при невалидных данных (пустое имя)', async () => {
      const invalidData = { 
        name: '',
        mapTemplates: [mapTemplate._id.toString()] // Поле все равно должно быть валидным
      };

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: invalidData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.name).toBeDefined();
    });
    
    it('должен возвращать ошибку 409 при дубликате', async () => {
        const templateData = { 
          name: 'Duplicate Template',
          mapTemplates: [mapTemplate._id.toString()]
        };
        await TournamentTemplate.create(templateData);

        const { req } = createMocks({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: templateData,
        });

        const response = await POST(req);
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.message).toBe('Шаблон с таким названием уже существует');
    });
  });
}); 