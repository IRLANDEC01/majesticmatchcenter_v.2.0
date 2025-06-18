import { POST } from './route';
import { dbConnect, dbDisconnect, dbClear, populateDb, GUCCI_STATS } from '@/lib/test-helpers';
import { mapService } from '@/lib/domain/maps/map-service';
import models from '@/models/index.js';

const { Map } = models;

describe('POST /api/admin/maps/[id]/rollback', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();

    // Сначала "завершаем" карту, чтобы ее можно было откатить
    const mapToComplete = testData.map;
    const winningFamily = testData.families[0];
    const mvpPlayer = testData.players[0];

    const playerStatsPayload = testData.players.map((player, index) => ({
      playerId: player._id.toString(),
      familyId: player.currentFamily.toString(),
      ...GUCCI_STATS[index % GUCCI_STATS.length],
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
    expect(body.status).toBe('active');
    expect(body.winner).toBeNull();
    expect(body.mvp).toBeNull();

    const dbMap = await Map.findById(mapToRollback._id).lean();
    expect(dbMap.status).toBe('active');
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