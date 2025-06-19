import { GET, PUT } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import models from '@/models';
import mongoose from 'mongoose';

const { Player } = models;

describe('/api/admin/players/[id]', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(dbClear);

  describe('GET', () => {
    let testPlayer;

    beforeEach(async () => {
      testPlayer = await Player.create({ firstName: 'Get', lastName: 'Test' });
    });

    it('должен возвращать игрока по ID и статус 200', async () => {
      const response = await GET(null, { params: { id: testPlayer._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.firstName).toBe(testPlayer.firstName);
    });

    it('должен возвращать 404, если игрок не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await GET(null, { params: { id: nonExistentId.toString() } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать 404, если игрок архивирован', async () => {
      testPlayer.archivedAt = new Date();
      await testPlayer.save();

      const response = await GET(null, { params: { id: testPlayer._id.toString() } });
      expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    let playerToUpdate;
    let conflictingPlayer;

    beforeEach(async () => {
      [playerToUpdate, conflictingPlayer] = await Player.create([
        { firstName: 'Update', lastName: 'Me' },
        { firstName: 'Conflict', lastName: 'Name' },
      ]);
    });

    it('должен успешно обновлять игрока', async () => {
      const updateData = { bio: 'A new bio for testing' };
      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: playerToUpdate._id.toString() } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.bio).toBe(updateData.bio);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: conflictingPlayer.firstName,
          lastName: conflictingPlayer.lastName,
        }),
      });

      const response = await PUT(request, { params: { id: playerToUpdate._id.toString() } });
      expect(response.status).toBe(409);
    });
  });
}); 