import mongoose from 'mongoose';
import { POST } from './route';
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import { mapService } from '@/lib/domain/maps/map-service';

describe('POST /api/admin/maps/[id]/rollback', () => {
  let testTournament;
  let testMap;
  let testFamily;
  let testPlayer;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    const testTournamentTemplate = await TournamentTemplate.create({
      name: 'Test Template',
      slug: 'test-template',
      mapTemplates: [new mongoose.Types.ObjectId()],
    });

    testFamily = await Family.create({
      name: 'Test Family',
      slug: 'test-family',
      displayLastName: 'TestFamily',
    });

    testTournament = await Tournament.create({
      name: 'Test Tournament',
      slug: 'test-tournament',
      template: testTournamentTemplate._id,
      tournamentType: 'family',
      startDate: new Date(),
      participants: [{
        family: testFamily._id,
        participantType: 'family',
      }],
    });
    
    const testMapTemplate = await MapTemplate.create({
      name: 'Test Map Template',
      slug: 'test-map-template',
    });

    testPlayer = await Player.create({
      firstName: 'Test',
      lastName: 'Player',
      nickname: 'testplayer',
    });

    testMap = await Map.create({
      name: 'Test Map',
      status: 'active',
      tournament: testTournament._id,
      template: testMapTemplate._id,
      startDateTime: new Date(),
    });

    // Complete the map first to be able to roll it back
    await mapService.completeMap(testMap._id, {
      winnerFamilyId: testFamily._id.toString(),
      mvpPlayerId: testPlayer._id.toString(),
      ratingChanges: [],
      playerStats: [],
    });
  });

  it('должен откатить завершение карты и вернуть 200', async () => {
    const req = new Request(`http://localhost/api/admin/maps/${testMap._id}/rollback`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { id: testMap._id.toString() } });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('active');
    expect(body.winner).toBeNull();
    expect(body.mvp).toBeNull();

    const dbMap = await Map.findById(testMap._id).lean();
    expect(dbMap.status).toBe('active');
  });

  it('должен вернуть 409, если карта не в статусе "completed"', async () => {
    // First, roll back the map to 'active'
    await mapService.rollbackMapCompletion(testMap._id);

    const req = new Request(`http://localhost/api/admin/maps/${testMap._id}/rollback`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { id: testMap._id.toString() } });
    
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toContain('Откатить можно только завершенную карту');
  });
}); 