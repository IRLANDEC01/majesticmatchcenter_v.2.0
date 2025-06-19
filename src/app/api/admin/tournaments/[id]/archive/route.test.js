import mongoose from 'mongoose';
import { PATCH } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';

const { Tournament } = models;

describe('/api/admin/tournaments/[id]/archive', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('PATCH', () => {
    it('should archive a tournament and return 204', async () => {
      // Arrange
      const tournamentToArchive = testData.tournament;
      const req = new Request(`http://localhost/api/admin/tournaments/${tournamentToArchive._id}/archive`, {
        method: 'PATCH'
      });
      
      // Act
      const response = await PATCH(req, { params: { id: tournamentToArchive._id.toString() } });
      
      // Assert
      expect(response.status).toBe(204);

      // Verify it's archived in the DB by finding it with a special option
      const archivedTournament = await Tournament.findOne({ _id: tournamentToArchive._id }).setOptions({ includeArchived: true });
      expect(archivedTournament).not.toBeNull();
      expect(archivedTournament.archivedAt).toBeInstanceOf(Date);

      // Verify it's not returned by a regular find
      const foundTournament = await Tournament.findById(tournamentToArchive._id);
      expect(foundTournament).toBeNull();
    });

    it('should return 404 if tournament is not found', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}/archive`, {
        method: 'PATCH'
      });

      // Act
      const response = await PATCH(req, { params: { id: nonExistentId } });

      // Assert
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe('Tournament not found');
    });
  });
}); 