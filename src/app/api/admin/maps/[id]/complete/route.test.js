import { POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb, GUCCI_STATS } from '@/lib/test-helpers.js';

const { Map, Family, Player, FamilyMapParticipation, PlayerMapParticipation } = models;

describe('/api/admin/maps/[id]/complete', () => {
  let testData;

  beforeAll(dbConnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });
  afterAll(dbDisconnect);

  describe('POST', () => {
    it('должен успешно завершать карту и записывать турнирные очки', async () => {
      // Arrange
      const map = await Map.findById(testData.map._id);
      const winnerFamily = testData.families[0];
      const otherFamily = testData.families[1];
      const mvp = testData.players[0];

      const payload = {
        winnerFamilyId: winnerFamily._id.toString(),
        mvpPlayerId: mvp._id.toString(),
        familyRatingChange: 10,
        familyTournamentPoints: [
          { familyId: winnerFamily._id.toString(), points: 3 },
          { familyId: otherFamily._id.toString(), points: 0 },
        ],
        playerStats: testData.players.map((player, index) => ({
          playerId: player._id.toString(),
          familyId: player.currentFamily.toString(),
          ...GUCCI_STATS[index % GUCCI_STATS.length], // Циклически берем статистику из файла
        })),
      };

      const request = new Request(`http://localhost/api/admin/maps/${map._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Act
      const response = await POST(request, { params: { id: map._id.toString() } });

      // Assert
      expect(response.status).toBe(200);
      
      const updatedMap = await Map.findById(map._id);
      expect(updatedMap.status).toBe('completed');

      const participations = await FamilyMapParticipation.find({ mapId: map._id });
      expect(participations.length).toBe(2);

      const winnerParticipation = participations.find(p => p.familyId.toString() === winnerFamily._id.toString());
      expect(winnerParticipation.tournamentPoints).toBe(3);
      expect(winnerParticipation.ratingChange).toBe(10);
      
      const otherParticipation = participations.find(p => p.familyId.toString() === otherFamily._id.toString());
      expect(otherParticipation.tournamentPoints).toBe(0);
      expect(otherParticipation.ratingChange).toBe(0);
    });
  });
}); 