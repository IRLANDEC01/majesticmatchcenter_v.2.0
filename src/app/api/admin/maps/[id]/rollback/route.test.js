import { POST } from './route';
import { dbConnect, dbDisconnect, dbClear, populateDb, GUCCI_STATS } from '@/lib/test-helpers.js';
import { mapService } from '@/lib/domain/maps/map-service';
import models from '@/models/index.js';
import { STATUSES } from '@/lib/constants.js';

const { Map } = models;

describe('POST /api/admin/maps/[id]/rollback', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb({
      numFamilies: 2,
      numPlayers: 2,
      maps: [{ status: STATUSES.ACTIVE }]
    });
    testData = data;

    // Сначала "завершаем" карту, чтобы ее можно было откатить
    const mapToComplete = testData.map;
    const winningFamily = testData.familyGucci;
    const mvpPlayer = testData.playerGucci;

    // Явно находим ID семей и их игроков, чтобы не полагаться на testData.players
    const familiesWithPlayers = [
      { familyId: testData.familyGucci._id.toString(), playerId: testData.playerGucci._id.toString() },
      { familyId: testData.familyUzi._id.toString(), playerId: testData.playerUzi._id.toString() }
    ];

    const playerStatsPayload = familiesWithPlayers.map((fam) => ({
      playerId: fam.playerId,
      familyId: fam.familyId,
      ...GUCCI_STATS[0],
    }));

    await mapService.completeMap(mapToComplete._id.toString(), {
      winnerFamilyId: winningFamily._id.toString(),
      mvpPlayerId: mvpPlayer._id.toString(),
      familyRatingChange: 100,
      playerStats: playerStatsPayload,
    });

    // Обновляем testData.map, чтобы он содержал завершенную карту
    testData.map = await Map.findById(mapToComplete._id).lean();
  });

  it('должен откатить завершение карты и вернуть 200', async () => {
    const mapToRollback = testData.map;
    const req = new Request(`http://localhost/api/admin/maps/${mapToRollback._id}/rollback`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { id: mapToRollback._id.toString() } });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe(STATUSES.ACTIVE);
    expect(body.winner).toBeNull();
    expect(body.mvp).toBeNull();

    const dbMap = await Map.findById(mapToRollback._id).lean();
    expect(dbMap.status).toBe(STATUSES.ACTIVE);
  });

  it('должен вернуть 409, если карта не в статусе "completed"', async () => {
    // First, roll back the map to 'active'
    const mapToRollback = testData.map;
    await mapService.rollbackMapCompletion(mapToRollback._id);

    const req = new Request(`http://localhost/api/admin/maps/${mapToRollback._id}/rollback`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { id: mapToRollback._id.toString() } });
    
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toContain('Откатить можно только завершенную карту');
  });
}); 