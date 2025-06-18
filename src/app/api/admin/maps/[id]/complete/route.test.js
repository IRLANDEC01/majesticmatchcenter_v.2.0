import mongoose from 'mongoose';
import { POST } from './route';
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import FamilyRatingHistory from '@/models/family/FamilyRatingHistory';
import PlayerRatingHistory from '@/models/player/PlayerRatingHistory';
import PlayerMapParticipation from '@/models/player/PlayerMapParticipation';

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
    await Map.deleteMany({});
    await Tournament.deleteMany({});
    await Family.deleteMany({});
    await Player.deleteMany({});
    await TournamentTemplate.deleteMany({});
    await MapTemplate.deleteMany({});
    await FamilyRatingHistory.deleteMany({});
    await PlayerRatingHistory.deleteMany({});
    await PlayerMapParticipation.deleteMany({});

    const testTournamentTemplate = await TournamentTemplate.create({
      name: 'Test Template',
      slug: 'test-template',
      mapTemplates: [new mongoose.Types.ObjectId()],
    });

    const testMapTemplate = await MapTemplate.create({
      name: 'Test Map Template',
      slug: 'test-map-template',
    });
    
    // Сначала создаем Семью
    testFamily = await Family.create({
      name: 'Test Family',
      slug: 'test-family',
      displayLastName: 'TestFamily',
      rating: 100, // Начальный рейтинг для теста
    });

    // Затем создаем Турнир, который на нее ссылается
    testTournament = await Tournament.create({
      name: 'Test Tournament',
      slug: 'test-tournament',
      template: testTournamentTemplate._id,
      tournamentType: 'family',
      startDate: new Date(),
      participants: [
        {
          family: testFamily._id,
          participantType: 'family',
        },
      ],
    });

    testPlayer = await Player.create({
      firstName: 'Test',
      lastName: 'Player',
      nickname: 'testplayer',
      currentFamily: testFamily._id,
      rating: 50, // Устанавливаем начальный рейтинг для теста
    });

    testMap = await Map.create({
      name: 'Test Map',
      status: 'active',
      tournament: testTournament._id,
      template: testMapTemplate._id,
      startDateTime: new Date(),
      participants: [
        {
          participant: testFamily._id,
          players: [testPlayer._id],
        },
      ],
    });
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it('должен успешно завершить карту, обновить рейтинги и статистику', async () => {
    // Arrange
    const initialFamilyRating = 100;
    const initialPlayerRating = 50;
    const familyRatingChange = 10;
    const playerKills = 5;
    const playerRatingChange = playerKills;

    const completionData = {
      winnerFamilyId: testFamily._id.toString(),
      mvpPlayerId: testPlayer._id.toString(),
      ratingChanges: [
        {
          familyId: testFamily._id.toString(),
          change: familyRatingChange,
        },
      ],
      playerStats: [
        {
          firstName: testPlayer.firstName,
          lastName: testPlayer.lastName,
          kills: playerKills,
          deaths: 3,
          damageDealt: 500,
          shotsFired: 100,
          hits: 50,
          hitAccuracy: 50.0,
          headshots: 10,
          headshotAccuracy: 20.0,
          weaponStats: [
            { weapon: 'AK-47', kills: 3, damage: 300 },
            { weapon: 'Glock-18', kills: 2, damage: 200 },
          ],
        },
      ],
    };

    const request = new Request(`http://localhost/api/admin/maps/${testMap._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(completionData),
    });

    // Act
    const response = await POST(request, { params: { id: testMap._id.toString() } });

    // Assert: Ответ API
    expect(response.status).toBe(200);

    // Assert: Статус карты
    const updatedMap = await Map.findById(testMap._id).lean();
    expect(updatedMap.status).toBe('completed');
    expect(updatedMap.winner.toString()).toBe(testFamily._id.toString());
    expect(updatedMap.mvp.toString()).toBe(testPlayer._id.toString());

    // Assert: Рейтинг семьи
    const winnerFamily = await Family.findById(testFamily._id).lean();
    expect(winnerFamily.rating).toBe(initialFamilyRating + familyRatingChange);

    const familyRatingRecord = await FamilyRatingHistory.findOne({ family: testFamily._id, map: testMap._id }).lean();
    expect(familyRatingRecord).not.toBeNull();
    expect(familyRatingRecord.change).toBe(familyRatingChange);

    // Assert: Статистика и рейтинг игрока
    const updatedPlayer = await Player.findById(testPlayer._id).lean();
    expect(updatedPlayer.rating).toBe(initialPlayerRating + playerRatingChange);

    const playerRatingRecord = await PlayerRatingHistory.findOne({ player: testPlayer._id, map: testMap._id }).lean();
    expect(playerRatingRecord).not.toBeNull();
    expect(playerRatingRecord.change).toBe(playerRatingChange);

    const playerMapParticipation = await PlayerMapParticipation.findOne({ player: testPlayer._id, map: testMap._id }).lean();
    expect(playerMapParticipation).not.toBeNull();
    expect(playerMapParticipation.kills).toBe(playerKills);
    expect(playerMapParticipation.deaths).toBe(3);
    expect(playerMapParticipation.damageDealt).toBe(500);
    expect(playerMapParticipation.shotsFired).toBe(100);
    expect(playerMapParticipation.hits).toBe(50);
    expect(playerMapParticipation.hitAccuracy).toBe(50.0);
    expect(playerMapParticipation.headshots).toBe(10);
    expect(playerMapParticipation.headshotAccuracy).toBe(20.0);
    expect(playerMapParticipation.weaponStats).toHaveLength(2);
    expect(playerMapParticipation.weaponStats[0].weapon).toBe('AK-47');
    expect(playerMapParticipation.weaponStats[0].kills).toBe(3);
  });
}); 