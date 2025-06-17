import { GET, PUT, DELETE } from './route';
import Player from '@/models/player/Player';
import mongoose from 'mongoose';

describe('/api/admin/players/[id]', () => {
  beforeAll(async () => {
    await Player.init();
  });

  describe('GET', () => {
    it('должен возвращать игрока по ID и статус 200', async () => {
      const testPlayer = await new Player({ firstName: 'PlayerApiTestGet', lastName: 'Test' }).save();
      const response = await GET(null, { params: { id: testPlayer._id.toString() } });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.firstName).toBe('PlayerApiTestGet');
      expect(body.lastName).toBe('Test');
    });

    it('должен возвращать 404, если игрок не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await GET(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать 404, если игрок архивирован', async () => {
      const testPlayer = await new Player({ firstName: 'ArchivedPlayer', lastName: 'Test' }).save();
      await testPlayer.updateOne({ $set: { archivedAt: new Date() } });

      const response = await GET(null, { params: { id: testPlayer._id.toString() } });
      expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять игрока', async () => {
      const testPlayer = await new Player({ firstName: 'PlayerApiTestPut', lastName: 'Test' }).save();
      const updateData = { bio: 'A new bio' };
      const request = new Request(`http://localhost/api/admin/players/${testPlayer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: testPlayer._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.bio).toBe('A new bio');
    });

    it('должен возвращать 404 при попытке обновить несуществующего игрока', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const request = new Request(`http://localhost/api/admin/players/${nonExistentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: 'Does not matter' }),
        });
        const response = await PUT(request, { params: { id: nonExistentId.toString() } });
        expect(response.status).toBe(404);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      const player1 = await Player.create({ firstName: 'Player', lastName: 'One' });
      const player2 = await Player.create({ firstName: 'Player', lastName: 'Two' });

      const request = new Request(`http://localhost/api/admin/players/${player2._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Player', lastName: 'One' }), // Try to use player1's name
      });
      
      const response = await PUT(request, { params: { id: player2._id.toString() } });
      expect(response.status).toBe(409);
    });
  });

  describe('DELETE', () => {
    it('должен архивировать игрока и возвращать 200', async () => {
      const testPlayer = await new Player({ firstName: 'PlayerApiTestDelete', lastName: 'Test' }).save();
      const response = await DELETE(null, { params: { id: testPlayer._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.archivedAt).toBeDefined();
      expect(new Date(body.archivedAt)).toBeInstanceOf(Date);

      const dbPlayer = await Player.findById(testPlayer._id);
      expect(dbPlayer).not.toBeNull();
      if (dbPlayer) {
        expect(dbPlayer.archivedAt).toBeInstanceOf(Date);
      }
    });

    it('должен возвращать 404 при попытке архивировать несуществующего игрока', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await DELETE(null, { params: { id: nonExistentId.toString() } });
        expect(response.status).toBe(404);
    });

    it('должен возвращать 404 при попытке архивировать уже архивированного игрока', async () => {
      const testPlayer = await new Player({ firstName: 'AlreadyArchived', lastName: 'Test' }).save();
      await DELETE(null, { params: { id: testPlayer._id.toString() } });

      // Повторный вызов
      const response = await DELETE(null, { params: { id: testPlayer._id.toString() } });
      expect(response.status).toBe(404);
    });
  });
}); 