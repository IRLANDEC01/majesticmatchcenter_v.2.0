import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import Player from '@/models/player/Player';
import { revalidatePath } from 'next/cache';
import { PATCH } from './route';

// Мокируем внешние зависимости
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/players/[id]/archive', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  it('должен архивировать игрока и вызывать revalidatePath', async () => {
    // Arrange
    const player = await Player.create({
      firstName: 'John',
      lastName: 'Doe',
    });
    const url = `http://localhost/api/admin/players/${player._id}/archive`;
    const request = new Request(url, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: player._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.archivedAt).not.toBeNull();
    // Проверяем, что дата валидная
    expect(new Date(body.archivedAt)).toBeInstanceOf(Date);

    expect(revalidatePath).toHaveBeenCalledWith('/admin/players');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 404, если игрок для архивации не найден', async () => {
    // Arrange
    const nonExistentId = '60f8d3b4b5f4a1a8c4b8c8b8'; // Валидный, но несуществующий ID
    const url = `http://localhost/api/admin/players/${nonExistentId}/archive`;
    const request = new Request(url, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId } });

    // Assert
    expect(response.status).toBe(404);
  });
});