import { GET, PUT } from './route';
import Tournament from '@/models/tournament/Tournament';
import mongoose from 'mongoose';

describe('API /api/admin/tournaments/[id]', () => {
  let testTournament;

  beforeAll(async () => {
    await Tournament.init();
  });

  beforeEach(async () => {
    testTournament = await new Tournament({ 
      name: 'Test Tournament',
      slug: 'test-tournament-put',
      template: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      tournamentType: 'family',
    }).save();
  });

  afterEach(async () => {
    await Tournament.deleteMany({});
  });

  describe('GET', () => {
    it('должен возвращать турнир по ID и статус 200', async () => {
      const response = await GET(null, { params: { id: testTournament._id.toString() } });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.name).toBe('Test Tournament');
    });

    it('должен возвращать 404, если турнир не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await GET(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять турнир', async () => {
      const updateData = { name: 'Updated Name' };
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournament._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: testTournament._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Updated Name');

      const dbTournament = await Tournament.findById(testTournament._id);
      expect(dbTournament.name).toBe('Updated Name');
    });

    it('должен возвращать 404 при попытке обновить несуществующий турнир', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Does not matter' }),
        });
        const response = await PUT(request, { params: { id: nonExistentId.toString() } });
        expect(response.status).toBe(404);
    });
  });
}); 