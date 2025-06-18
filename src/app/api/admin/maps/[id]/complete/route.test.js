import { POST as completeMap } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb, GUCCI_STATS } from '@/lib/test-helpers.js';

const { Map, Family, Player, FamilyMapParticipation, PlayerMapParticipation } = models;

describe('API /api/admin/maps/[id]/complete', () => {
  let testData;

  beforeAll(dbConnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });
  afterAll(dbDisconnect);

  describe('POST', () => {
    it('должен успешно завершить карту, обновить рейтинг семьи и создать запись об участии', async () => {
      // Arrange
      const mapToComplete = testData.map;
      const winningFamily = testData.families[0];
      const mvpPlayer = testData.players[0]; // Предположим, что MVP - первый игрок
      const initialRating = winningFamily.rating;
      const ratingChange = 100;

      // Используем реальные данные статистики для всех игроков
      const playerStatsPayload = testData.players.map((player, index) => ({
        playerId: player._id.toString(),
        familyId: player.currentFamily.toString(),
        ...GUCCI_STATS[index % GUCCI_STATS.length], // Циклически берем статистику из файла
      }));

      const payload = {
        winnerFamilyId: winningFamily._id.toString(),
        mvpPlayerId: mvpPlayer._id.toString(),
        familyRatingChange: ratingChange,
        playerStats: playerStatsPayload,
    };

      const request = new Request(`http://localhost/api/admin/maps/${mapToComplete._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

      // Act
      const response = await completeMap(request, { params: { id: mapToComplete._id.toString() } });

      // Assert
    expect(response.status).toBe(200);

      // 1. Проверяем, что карта обновлена
      const updatedMap = await Map.findById(mapToComplete._id);
      expect(updatedMap.status).toBe('completed');
      expect(updatedMap.winner.toString()).toBe(winningFamily._id.toString());
      expect(updatedMap.mvp.toString()).toBe(mvpPlayer._id.toString());
      
      // 2. Проверяем, что рейтинг семьи в основной модели обновился
      const updatedFamily = await Family.findById(winningFamily._id);
      expect(updatedFamily.rating).toBe(initialRating + ratingChange);

      // 3. Проверяем, что создалась запись об участии семьи
      const familyParticipation = await FamilyMapParticipation.findOne({
        familyId: winningFamily._id,
        mapId: mapToComplete._id,
      });
      expect(familyParticipation).not.toBeNull();
      expect(familyParticipation.ratingChange).toBe(ratingChange);

      // 4. Проверяем, что создались записи статистики для каждого игрока
      const playerParticipations = await PlayerMapParticipation.find({ mapId: mapToComplete._id });
      expect(playerParticipations.length).toBe(testData.players.length);
      const mvpStats = playerParticipations.find(p => p.playerId.toString() === mvpPlayer._id.toString());
      expect(mvpStats.kills).toBe(GUCCI_STATS[0].kills); // Проверяем выборочно для MVP
    });
  });
}); 