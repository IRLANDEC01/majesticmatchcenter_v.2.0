import mongoose from 'mongoose';
// import { POST } from './route'; // Будет импортирован динамически
import { connectToDatabase, disconnectFromDatabase, clearDatabase } from '@/lib/db';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import PlayerMapParticipation from '@/models/player/PlayerMapParticipation';
import FamilyMapParticipation from '@/models/family/FamilyMapParticipation';

describe('POST /api/admin/maps/[id]/complete', () => {
  let testTournament, testMap, testFamily, testMvpPlayer, otherFamily;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    jest.resetModules();
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
    
    // Сначала создаем Семью
    testFamily = await Family.create({
      name: 'Test Family',
      slug: 'test-family',
      displayLastName: 'Family',
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

    testMvpPlayer = await Player.create({
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
          players: [testMvpPlayer._id],
        },
      ],
    });

    otherFamily = await Family.create({ name: 'Other Family', slug: 'other-family', displayLastName: 'Other', rating: 1000 });
  });

  it('должен успешно завершить карту, обновить рейтинги и создать записи участия', async () => {
    // Arrange
    const initialFamilyRating = 100;
    const initialPlayerRating = 50;
    const familyRatingChange = 10;
    const playerKills = 5;
    const playerRatingChange = playerKills;

    const completionData = {
      winnerFamilyId: testFamily._id.toString(),
      mvpPlayerId: testMvpPlayer._id.toString(),
      ratingChanges: [
        {
          familyId: testFamily._id.toString(),
          change: familyRatingChange,
        },
      ],
      playerStats: [
        {
          firstName: testMvpPlayer.firstName,
          lastName: testMvpPlayer.lastName,
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
    const { POST } = await import('./route'); // Динамический импорт
    const response = await POST(request, { params: { id: testMap._id.toString() } });

    // Assert: Ответ API
    expect(response.status).toBe(200);

    // Assert: Статус карты
    const updatedMap = await Map.findById(testMap._id).lean();
    expect(updatedMap.status).toBe('completed');
    expect(updatedMap.winner.toString()).toBe(testFamily._id.toString());
    expect(updatedMap.mvp.toString()).toBe(testMvpPlayer._id.toString());

    // Assert: Рейтинг семьи
    const winnerFamily = await Family.findById(testFamily._id).lean();
    expect(winnerFamily.rating).toBe(initialFamilyRating + familyRatingChange);

    const familyMapRecord = await FamilyMapParticipation.findOne({ familyId: testFamily._id, mapId: testMap._id }).lean();
    expect(familyMapRecord).not.toBeNull();
    expect(familyMapRecord.ratingChange).toBe(familyRatingChange);
    expect(familyMapRecord.previousRating).toBe(initialFamilyRating);
    expect(familyMapRecord.newRating).toBe(initialFamilyRating + familyRatingChange);
    expect(familyMapRecord.isWinner).toBe(true);

    // Assert: Статистика и рейтинг игрока
    const updatedPlayer = await Player.findById(testMvpPlayer._id).lean();
    expect(updatedPlayer.rating).toBe(initialPlayerRating + playerRatingChange);

    const playerMapParticipation = await PlayerMapParticipation.findOne({ playerId: testMvpPlayer._id, mapId: testMap._id }).lean();
    expect(playerMapParticipation).not.toBeNull();
    expect(playerMapParticipation.kills).toBe(playerKills);
    // Проверяем рейтинговый контекст в записи участия
    expect(playerMapParticipation.ratingChange).toBe(playerRatingChange);
    expect(playerMapParticipation.previousRating).toBe(initialPlayerRating);
    expect(playerMapParticipation.newRating).toBe(initialPlayerRating + playerRatingChange);
  });
}); 