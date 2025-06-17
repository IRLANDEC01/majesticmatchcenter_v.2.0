import mongoose from 'mongoose';
import { POST } from './route';
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';

describe('POST /api/admin/maps/[id]/complete', () => {
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

    const testMapTemplate = await MapTemplate.create({
      name: 'Test Map Template',
      slug: 'test-map-template',
    });

    testTournament = await Tournament.create({
      name: 'Test Tournament',
      slug: 'test-tournament',
      template: testTournamentTemplate._id,
      tournamentType: 'family',
      startDate: new Date(),
    });

    testFamily = await Family.create({
      name: 'Test Family',
      slug: 'test-family',
      displayLastName: 'TestFamily',
    });

    testPlayer = await Player.create({
      firstName: 'Test',
      lastName: 'Player',
      nickname: 'testplayer',
      currentFamily: testFamily._id,
    });

    testMap = await Map.create({
      name: 'Test Map',
      status: 'active',
      tournament: testTournament._id,
      template: testMapTemplate._id,
      startDateTime: new Date(),
      participantFamilies: [
        {
          family: testFamily._id,
          players: [testPlayer._id],
        },
      ],
    });
  });

  it('должен успешно завершить карту и вернуть 200', async () => {
    const completionData = {
      winnerId: testFamily._id.toString(),
      mvpId: testPlayer._id.toString(),
      ratingChanges: [],
      statistics: [],
    };
    const req = new Request(`http://localhost/api/admin/maps/${testMap._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completionData),
    });

    const response = await POST(req, { params: { id: testMap._id.toString() } });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('completed');
    expect(body.winner.toString()).toBe(testFamily._id.toString());
    expect(body.mvp.toString()).toBe(testPlayer._id.toString());

    const dbMap = await Map.findById(testMap._id).lean();
    expect(dbMap.status).toBe('completed');
  });
}); 