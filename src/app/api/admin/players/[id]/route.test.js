import { GET, PATCH } from './route.js';
import { dbClear } from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import Player from '@/models/player/Player.js';
import mongoose from 'mongoose';

// Мокируем внешние зависимости
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('/api/admin/players/[id]', () => {
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  describe('GET', () => {
    it('должен возвращать игрока по ID и статус 200', async () => {
      // Arrange
      const player = await Player.create({ firstName: 'Get', lastName: 'Player' });
      const request = new Request(`http://localhost/api/admin/players/${player._id}`);

      // Act
      const response = await GET(request, { params: { id: player._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.firstName).toBe(player.firstName);
    });

    it('должен возвращать 404, если игрок не найден', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId();
      const request = new Request(`http://localhost/api/admin/players/${nonExistentId}`);
      
      // Act
      const response = await GET(request, { params: { id: nonExistentId.toString() } });
      
      // Assert
      expect(response.status).toBe(404);
    });

    it('должен возвращать 404, если игрок архивирован', async () => {
      // Arrange
      const player = await Player.create({
        firstName: 'Archived',
        lastName: 'Getter',
        archivedAt: new Date(),
      });
      const request = new Request(`http://localhost/api/admin/players/${player._id}`);

      // Act
      const response = await GET(request, { params: { id: player._id.toString() } });
      
      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('должен успешно обновлять игрока и вызывать revalidatePath', async () => {
      // Arrange
      const player = await Player.create({ firstName: 'Update', lastName: 'Me' });
      const updateData = { bio: 'This player has been updated.' };
      const request = new Request(`http://localhost/api/admin/players/${player._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PATCH(request, { params: { id: player._id.toString() } });
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.bio).toBe(updateData.bio);
      
      expect(revalidatePath).toHaveBeenCalledWith('/admin/players');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/players/${player._id}`);
      expect(revalidatePath).toHaveBeenCalledWith(`/players/${player.slug}`);
    });

    it('должен возвращать 409 при попытке обновить имя на уже существующее', async () => {
      // Arrange
      await Player.create({ firstName: 'Existing', lastName: 'Name' });
      const playerToUpdate = await Player.create({ firstName: 'Original', lastName: 'Name' });
      
      const updateData = { firstName: 'Existing', lastName: 'Name' };
      const request = new Request(`http://localhost/api/admin/players/${playerToUpdate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Act
      const response = await PATCH(request, { params: { id: playerToUpdate._id.toString() } });
      
      // Assert
      expect(response.status).toBe(409);
    });
  });
});
