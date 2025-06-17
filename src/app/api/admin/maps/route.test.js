import { GET, POST } from './route';
import Map from '@/models/map/Map';
import models from '@/models';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import MapTemplate from '@/models/map/MapTemplate';

describe('/api/admin/maps', () => {
  let testTournament;
  let testTemplate;
  let mapTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      Map.deleteMany({}),
      models.Tournament.deleteMany({}),
      models.TournamentTemplate.deleteMany({}),
      models.Family.deleteMany({}),
      models.Player.deleteMany({}),
      MapTemplate.deleteMany({}),
    ]);
    
    mapTemplate = await MapTemplate.create({ name: 'Test Map Template for Maps', slug: 'test-map-template-for-maps' });

    testTemplate = await models.TournamentTemplate.create({
      name: 'Test Template for Maps API',
      slug: 'test-template-for-maps-api',
      mapTemplates: [mapTemplate._id],
    });

    testTournament = await models.Tournament.create({
      name: 'Test Tournament for Maps',
      slug: 'test-tournament-for-maps-api',
      template: testTemplate._id,
      tournamentType: 'family',
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 86400000), // +1 day
      status: 'active',
      rules: 'Standard rules apply',
      prizes: 'TBD',
    });
  });

  describe('GET', () => {
    it('должен возвращать пустой массив, если карт нет', async () => {
      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toHaveLength(0);
    });

    it('должен возвращать список карт', async () => {
      await Map.create({
        name: 'Test Map',
        slug: 'test-map',
        tournament: testTournament._id,
        template: mapTemplate._id,
        startDateTime: new Date(),
      });

      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('Test Map');
    });
  });

  describe('POST', () => {
    it('должен успешно создавать карту и возвращать 201', async () => {
      const newMapData = {
        name: 'New Test Map',
        tournament: testTournament._id.toString(),
        template: mapTemplate._id.toString(),
        startDateTime: new Date(),
      };

      const req = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapData),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(newMapData.name);
      expect(body.tournament).toBe(newMapData.tournament);
      expect(body.template).toBe(newMapData.template);

      const dbMap = await Map.findById(body._id);
      expect(dbMap).not.toBeNull();
    });

    it('должен возвращать 400 при невалидных данных', async () => {
      const newMapData = {
        name: 'Invalid Map',
        // template отсутствует
      };

      const req = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapData),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.template).toBeDefined();
    });

    it('должен возвращать 409 при дублировании slug', async () => {
      await Map.create({ 
        name: 'Existing Map',
        slug: 'existing-map',
        tournament: testTournament._id,
        template: mapTemplate._id,
        startDateTime: new Date(),
      });

      const newMapData = {
        name: 'Another map with same slug',
        slug: 'existing-map',
        tournament: testTournament._id.toString(),
        template: mapTemplate._id.toString(),
        startDateTime: new Date(),
      };
      const req = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapData),
      });

      const response = await POST(req);
      expect(response.status).toBe(409);
    });
  });
}); 