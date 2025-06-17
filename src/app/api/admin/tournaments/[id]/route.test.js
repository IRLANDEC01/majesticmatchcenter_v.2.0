import { GET, PUT, DELETE } from './route';
import { connectToDatabase } from '@/lib/db';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';

describe('API /api/admin/tournaments/[id]', () => {
  let testTournament;
  let testTemplate;
  let testMapTemplate;

  beforeAll(async () => {
    await connectToDatabase();
    await Tournament.init();
    await TournamentTemplate.init();
    await MapTemplate.init();
  });

  beforeEach(async () => {
    // Создаем связанные сущности
    testMapTemplate = await MapTemplate.create({ name: 'Test Map For Single Tournament' });
    testTemplate = await TournamentTemplate.create({
      name: 'Test Template For Single Tournament',
      mapTemplates: [testMapTemplate._id],
    });
    testTournament = await Tournament.create({
      name: 'Test Tournament Name',
      template: testTemplate._id,
      startDate: new Date(),
      tournamentType: 'family',
    });
  });

  afterEach(async () => {
    // Очищаем коллекции после каждого теста
    await Tournament.deleteMany({});
    await TournamentTemplate.deleteMany({});
    await MapTemplate.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET', () => {
    it('должен возвращать турнир по ID и статус 200', async () => {
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournament._id}`);
      const response = await GET(request, { params: { id: testTournament._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(testTournament.name);
      expect(body._id).toBe(testTournament._id.toString());
    });

    it('должен возвращать ошибку 404, если турнир не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`);
      const response = await GET(request, { params: { id: nonExistentId.toString() } });
      
      expect(response.status).toBe(404);
    });

    it('должен возвращать ошибку 400 при невалидном ID', async () => {
      const invalidId = '123';
      const request = new Request(`http://localhost/api/admin/tournaments/${invalidId}`);
      const response = await GET(request, { params: { id: invalidId } });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять турнир и возвращать статус 200', async () => {
      const updatedData = { name: 'Updated Tournament Name', description: 'Updated Description' };
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournament._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const response = await PUT(request, { params: { id: testTournament._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(updatedData.name);
      expect(body.description).toBe(updatedData.description);
    });

    it('должен возвращать 404, если турнир для обновления не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Does not matter' }),
      });

      const response = await PUT(request, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });
    
    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      const invalidData = { name: '' }; // Пустое имя невалидно по схеме
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournament._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await PUT(request, { params: { id: testTournament._id.toString() } });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('должен успешно удалять турнир и возвращать статус 204', async () => {
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournament._id}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: testTournament._id.toString() } });

      expect(response.status).toBe(204);

      // Проверяем, что турнир действительно удален из базы
      const deletedTournament = await Tournament.findById(testTournament._id);
      expect(deletedTournament).toBeNull();
    });

    it('должен возвращать 404, если турнир для удаления не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });
  });
}); 