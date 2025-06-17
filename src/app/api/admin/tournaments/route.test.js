import { createMocks } from 'node-mocks-http';
import { POST, GET } from './route';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';

describe('API /api/admin/tournaments', () => {
  let tournamentTemplate;
  let mapTemplate;

  beforeAll(async () => {
    await Tournament.init();
    await TournamentTemplate.init();
    await MapTemplate.init();
  });

  beforeEach(async () => {
    // Сначала создаем шаблон карты
    mapTemplate = await MapTemplate.create({ name: 'Test Map' });
    // Теперь создаем шаблон турнира с обязательной ссылкой на шаблон карты
    tournamentTemplate = await TournamentTemplate.create({
      name: `Test Template ${new Date().getTime()}`, // Уникальное имя
      mapTemplates: [mapTemplate._id],
    });
  });

  describe('POST', () => {
    it('должен успешно создавать турнир и возвращать статус 201', async () => {
      const tournamentData = {
        name: 'Majestic Champions League',
        template: tournamentTemplate._id.toString(),
        tournamentType: 'family',
        startDate: new Date().toISOString(),
      };

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tournamentData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(tournamentData.name);
      expect(body.slug).toBe('majestic-champions-league');

      const dbTournament = await Tournament.findById(body._id);
      expect(dbTournament).not.toBeNull();
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      const invalidData = { name: 't' }; // Невалидные данные
      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: invalidData,
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe('GET', () => {
    it('должен возвращать список турниров', async () => {
      await Tournament.create({
        name: 'Tournament 1',
        template: tournamentTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      });
       await Tournament.create({
        name: 'Tournament 2',
        template: tournamentTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      });
      
      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });

    it('должен возвращать все турниры, включая архивированные', async () => {
       await Tournament.create({
        name: 'Active Tournament',
        template: tournamentTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      });
      const archived = await Tournament.create({
        name: 'Archived Tournament',
        template: tournamentTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      });
      archived.archivedAt = new Date();
      await archived.save();

      const { req } = createMocks({
        method: 'GET',
        query: { include_archived: 'true' },
      });
      const response = await GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
});
