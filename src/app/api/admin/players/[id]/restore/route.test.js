import { PATCH } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import Player from '@/models/player/Player.js';
import mongoose from 'mongoose';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/domain/players/player-service.js', () => ({
  unarchivePlayer: jest.fn(),
}));

import playerService from '@/lib/domain/players/player-service.js';

describe('API /api/admin/players/[id]/restore', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
    playerService.unarchivePlayer.mockClear();
  });

  it('должен успешно восстанавливать игрока и вызывать revalidatePath', async () => {
    // Arrange
    const playerId = new mongoose.Types.ObjectId();
    const restoredPlayer = { _id: playerId, firstName: 'Restored', lastName: 'Player', archivedAt: null };
    playerService.unarchivePlayer.mockResolvedValue(restoredPlayer);

    const request = new Request(`http://localhost/api/admin/players/${playerId}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: playerId.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.firstName).toBe('Restored');
    expect(playerService.unarchivePlayer).toHaveBeenCalledWith(playerId.toString());
    expect(revalidatePath).toHaveBeenCalledWith('/admin/players');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/players/${playerId}`);
  });

  it('должен возвращать 404, если игрок для восстановления не найден', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId();
    playerService.unarchivePlayer.mockResolvedValue(null);

    const request = new Request(`http://localhost/api/admin/players/${nonExistentId}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId.toString() } });

    // Assert
    expect(response.status).toBe(404);
  });
}); 