import { GET, PUT } from './route';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import models from '@/models';
import MapTemplate from '@/models/map/MapTemplate';

describe('/api/admin/maps/[id]', () => {
  let testTournament;
  let testMap;
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

    mapTemplate = await MapTemplate.create({ name: 'Test Map Template for Maps ID', slug: 'test-map-template-for-maps-id' });

    testTemplate = await models.TournamentTemplate.create({
      name: 'Test Template for Maps API',
      slug: 'test-template-for-maps-api',
      mapTemplates: [mapTemplate._id],
    });

    testTournament = await models.Tournament.create({
      name: 'Test Tournament for Maps',
      template: testTemplate._id,
      tournamentType: 'family',
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 86400000), // +1 day
      status: 'active',
      rules: 'Standard rules apply',
      prizes: 'TBD',
    });

    testMap = await Map.create({
      name: 'Initial Map',
      slug: 'initial-map',
      tournament: testTournament._id,
      template: mapTemplate._id,
      startDateTime: new Date(),
    });
  });

  describe('GET', () => {
    it('должен возвращать карту по ID', async () => {
      const response = await GET(null, { params: { id: testMap._id.toString() } });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.name).toBe('Initial Map');
    });

    it('должен возвращать 404, если карта не найдена', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await GET(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать 400 при невалидном ID', async () => {
      const response = await GET(null, { params: { id: 'invalid-id' } });
      expect(response.status).toBe(400);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять карту', async () => {
      const updateData = {
        name: 'Updated Map Name',
        description: 'New description',
      };
      const req = new Request(`http://localhost/api/admin/maps/${testMap._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(req, { params: { id: testMap._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Updated Map Name');
    });
  });
}); 