import { POST } from './route';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import Map from '@/models/map/Map';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import MapTemplate from '@/models/map/MapTemplate';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import { mapService } from '@/lib/domain/maps/map-service';

describe('POST /api/admin/maps/[id]/rollback', () => {
  let tournament;
  let mapTemplate;
  let family;
  let player;
  let map;

  beforeAll(async () => {
    await connectToDatabase();
    await Promise.all([
      Tournament.init(),
      MapTemplate.init(),
      Family.init(),
      Player.init(),
      Map.init(),
    ]);
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      Tournament.deleteMany({}),
      MapTemplate.deleteMany({}),
      Family.deleteMany({}),
      Player.deleteMany({}),
      Map.deleteMany({}),
    ]);

    mapTemplate = await MapTemplate.create({
      name: 'Test Map Template',
      slug: 'test-map-template',
    });

    const tournamentTemplate = await TournamentTemplate.create({
      name: 'Test Template',
      mapTemplates: [mapTemplate._id],
    });

    tournament = await Tournament.create({
      name: 'Test Tournament',
      slug: 'test-tournament',
      template: tournamentTemplate._id,
      tournamentType: 'family',
      startDate: new Date(),
    });

    family = await Family.create({
      name: 'Test Family',
      displayLastName: 'Family',
      slug: 'test-family',
    });

    player = await Player.create({
      firstName: 'Test',
      lastName: 'Player',
      nickname: 'testplayer',
      currentFamily: family._id,
    });

    map = await Map.create({
      name: 'Test Map',
      status: 'completed',
      startDateTime: new Date(),
      tournament: tournament._id,
      template: mapTemplate._id,
      participantFamilies: [
        {
          family: family._id,
          players: [player._id],
        },
      ],
    });

    // Complete the map first
    await mapService.completeMap(map._id, {
      winnerId: family._id,
      mvpId: player._id,
    });
  });

  it('should roll back the map completion and return 200', async () => {
    const request = new Request(`http://localhost/api/admin/maps/${map._id}/rollback`, {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: map._id } });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('active');
    expect(body.winner).toBeNull();
    expect(body.mvp).toBeNull();

    const dbMap = await Map.findById(map._id).lean();
    expect(dbMap.status).toBe('active');
  });
}); 