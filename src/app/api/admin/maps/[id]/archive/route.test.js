import { PATCH } from './route';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import { TOURNAMENT_SCORING_TYPES } from '@/lib/constants';

describe('API /api/admin/maps/[id]/archive', () => {
  let testMap;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();

    // Создаем всю цепочку зависимостей для карты
    const mapTemplate = await MapTemplate.create({ name: 'Test Map Template', slug: 'test-map-template' });
    const tournamentTemplate = await TournamentTemplate.create({
      name: 'Test Tournament Template',
      slug: 'test-tournament-template',
      mapTemplates: [mapTemplate._id],
      scoringType: TOURNAMENT_SCORING_TYPES.LEADERBOARD,
    });
    const tournament = await Tournament.create({
      name: 'Test Tournament',
      slug: 'test-tournament',
      template: tournamentTemplate._id,
      tournamentType: 'family',
      scoringType: TOURNAMENT_SCORING_TYPES.LEADERBOARD,
      startDate: new Date(),
    });
    testMap = await Map.create({
      name: 'Test Map',
      slug: 'test-map',
      tournament: tournament._id,
      template: mapTemplate._id,
      startDateTime: new Date(),
    });
  });

  it('должен успешно архивировать карту', async () => {
    const request = new Request(`http://localhost/api/admin/maps/${testMap._id}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: testMap._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbMap = await Map.findById(testMap._id).setOptions({ includeArchived: true });
    expect(dbMap.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать карту из архива', async () => {
    // Сначала архивируем
    await testMap.updateOne({ $set: { archivedAt: new Date() } });

    const request = new Request(`http://localhost/api/admin/maps/${testMap._id}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    });

    const response = await PATCH(request, { params: { id: testMap._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbMap = await Map.findById(testMap._id);
    expect(dbMap).not.toBeNull();
    expect(dbMap.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если карта не найдена', async () => {
    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const request = new Request(`http://localhost/api/admin/maps/${nonExistentId}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });
}); 