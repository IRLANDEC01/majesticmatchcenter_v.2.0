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
    it('должен успешно создавать карты с инкрементальным slug и возвращать 201', async () => {
      // --- Создание первой карты ---
      const mapData1 = {
        name: 'Test Map 1',
        tournament: testTournament._id.toString(),
        template: mapTemplate._id.toString(),
        startDateTime: new Date(),
      };

      const req1 = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData1),
      });

      const response1 = await POST(req1);
      const body1 = await response1.json();

      const expectedSlug1 = `${testTournament.slug}-${mapTemplate.slug}-1`;

      expect(response1.status).toBe(201);
      expect(body1.name).toBe(mapData1.name);
      expect(body1.slug).toBe(expectedSlug1);

      const dbMap1 = await Map.findById(body1._id);
      expect(dbMap1).not.toBeNull();
      expect(dbMap1.slug).toBe(expectedSlug1);

      // --- Создание второй карты в том же турнире ---
      const mapData2 = {
        name: 'Test Map 2',
        tournament: testTournament._id.toString(),
        template: mapTemplate._id.toString(),
        startDateTime: new Date(),
      };
      
      const req2 = new Request('http://localhost/api/admin/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData2),
      });

      const response2 = await POST(req2);
      const body2 = await response2.json();
      
      const expectedSlug2 = `${testTournament.slug}-${mapTemplate.slug}-2`;
      
      expect(response2.status).toBe(201);
      expect(body2.name).toBe(mapData2.name);
      expect(body2.slug).toBe(expectedSlug2);

      const dbMap2 = await Map.findById(body2._id);
      expect(dbMap2).not.toBeNull();
      expect(dbMap2.slug).toBe(expectedSlug2);
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
  });
}); 