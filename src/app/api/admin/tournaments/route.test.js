import { POST, GET } from './route';
import Tournament from '@/models/tournament/Tournament.js';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import Family from '@/models/family/Family.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import { connectToDatabase } from '@/lib/db.js';

describe('API /api/admin/tournaments', () => {
  let testTemplate;
  let testFamily;
  let testMapTemplate;

  beforeAll(async () => {
    await connectToDatabase();
    await Tournament.init();
    await TournamentTemplate.init();
    await Family.init();
    await MapTemplate.init();
  });

  beforeEach(async () => {
    // Создаем шаблон карты, который является зависимостью для шаблона турнира
    testMapTemplate = await MapTemplate.create({
      name: 'Test Map for Template',
      slug: 'test-map-for-template',
    });

    // Создаем шаблон и семью, которые будут использоваться в тестах
    testTemplate = await TournamentTemplate.create({
      name: 'Test Template for Tournaments',
      slug: 'test-template-tournaments',
      mapTemplates: [testMapTemplate._id],
    });
    testFamily = await Family.create({
      name: 'Test Family for Tournaments',
      displayLastName: 'Test',
    });
  });

  describe('POST', () => {
    it('должен успешно создавать турнир и возвращать статус 201', async () => {
      const tournamentData = {
        name: 'Majestic Champions League',
        description: 'The main event of the year.',
        template: testTemplate._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
        participants: [
          {
            participantType: 'family',
            family: testFamily._id.toString(),
          },
        ],
      };

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(tournamentData.name);
      expect(body.slug).toBe('majestic-champions-league'); // Ожидаемый slug
      expect(body.participants).toHaveLength(1);
      expect(body.participants[0].family.toString()).toBe(testFamily._id.toString());
      
      const dbTournament = await Tournament.findById(body._id);
      expect(dbTournament).not.toBeNull();
    });

    it('должен возвращать ошибку 400 при невалидных данных (отсутствует template)', async () => {
      const invalidData = {
        name: 'Tournament without template',
        tournamentType: 'family',
        startDate: new Date(),
      };

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.template).toBeDefined();
    });
    
    it('должен возвращать ошибку 409, если турнир с таким slug уже существует', async () => {
      // Создаем первый турнир
      const tournamentData = {
        name: 'Clash Of Titans',
        template: testTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      };
      // Модель должна сгенерировать slug 'clash-of-titans'
      await new Tournament(tournamentData).save();

      // Пытаемся создать второй турнир с таким же именем
      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData),
      });

      const response = await POST(request);
      const body = await response.json();
      
      expect(response.status).toBe(409);
      expect(body.message).toContain('slug-конфликт');
    });
  });

  describe('GET', () => {
    it('должен возвращать список турниров и статус 200', async () => {
      // Создадим несколько турниров для теста
      await Tournament.create([
        { name: 'Tournament One', template: testTemplate._id, startDate: new Date(), tournamentType: 'family' },
        { name: 'Tournament Two', template: testTemplate._id, startDate: new Date(), tournamentType: 'team' },
      ]);

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'GET',
      });

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2); // Проверяем, что в базе есть как минимум 2 наших турнира
    });
  });
});
