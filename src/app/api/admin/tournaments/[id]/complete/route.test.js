import { POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';

const { Tournament, Family } = models;

describe('API /api/admin/tournaments/[id]/complete', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('POST', () => {
    it('должен успешно завершить турнир с ручным выбором победителя', async () => {
      // Arrange
      const tournamentToComplete = await Tournament.findById(testData.tournament._id);
      tournamentToComplete.scoringType = 'MANUAL_SELECTION';
      await tournamentToComplete.save();
      
      const winnerFamily = await Family.create({
        name: 'Winner Family',
        displayLastName: 'Winner',
        owner: testData.players[0]._id,
      });
      tournamentToComplete.participants.push({ participantType: 'family', family: winnerFamily._id });
      await tournamentToComplete.save();

      const requestData = { winnerId: winnerFamily._id.toString() };
      const request = new Request(`http://localhost/api/admin/tournaments/${tournamentToComplete._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      // Act
      const response = await POST(request, { params: { id: tournamentToComplete._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.status).toBe('completed');
      expect(body.winner.toString()).toBe(winnerFamily._id.toString());
      expect(body.endDate).not.toBeNull();
    });

    it('должен вернуть 400, если для ручного режима не указан ID победителя', async () => {
      // Arrange
      const tournamentToComplete = await Tournament.findById(testData.tournament._id);
      tournamentToComplete.scoringType = 'MANUAL_SELECTION';
      await tournamentToComplete.save();

      const request = new Request(`http://localhost/api/admin/tournaments/${tournamentToComplete._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Пустое тело
      });

      // Act
      const response = await POST(request, { params: { id: tournamentToComplete._id.toString() } });
      
      // Assert
      expect(response.status).toBe(400);
    });

    it('должен вернуть 501 для типа LEADERBOARD, так как он еще не реализован', async () => {
      // Arrange
      const tournamentToComplete = await Tournament.findById(testData.tournament._id);
      tournamentToComplete.scoringType = 'LEADERBOARD';
      await tournamentToComplete.save();

      const request = new Request(`http://localhost/api/admin/tournaments/${tournamentToComplete._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), 
      });

      // Act
      const response = await POST(request, { params: { id: tournamentToComplete._id.toString() } });
      
      // Assert
      expect(response.status).toBe(501);
    });
  });
}); 