import { PATCH } from './route';
import Player from '@/models/player/Player';
import Family from '@/models/family/Family';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/players/[id]/archive', () => {
  let testPlayer;
  let testFamily;

  beforeAll(async () => {
    await connectToDatabase();
    await Player.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Player.deleteMany({});
    await Family.deleteMany({});
    testPlayer = await Player.create({
      firstName: 'Test',
      lastName: 'Player',
      nickname: 'Archiver',
      email: 'archive@test.com',
    });
  });

  it('должен возвращать ошибку, если игрок является владельцем активной семьи', async () => {
    // Arrange: Создаем семью, где игрок является владельцем
    testFamily = await Family.create({
      name: 'Test Family',
      displayLastName: 'TestFamily',
      owner: testPlayer._id,
    });

    const request = new Request(`http://localhost/api/admin/players/${testPlayer._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    // Act
    const response = await PATCH(request, { params: { id: testPlayer._id.toString() } });
    
    // Assert
    // Теперь маршрут использует handleApiError, который вернет 400 для ValidationError
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('Нельзя заархивировать игрока');
  });

  it('должен успешно архивировать игрока', async () => {
    const request = new Request(`http://localhost/api/admin/players/${testPlayer._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: testPlayer._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbPlayer = await Player.findById(testPlayer._id).setOptions({ includeArchived: true });
    expect(dbPlayer.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать игрока из архива', async () => {
    await testPlayer.updateOne({ $set: { archivedAt: new Date() } });

    const request = new Request(`http://localhost/api/admin/players/${testPlayer._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
    });

    const response = await PATCH(request, { params: { id: testPlayer._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbPlayer = await Player.findById(testPlayer._id);
    expect(dbPlayer).not.toBeNull();
    expect(dbPlayer.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если игрок не найден', async () => {
    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const request = new Request(`http://localhost/api/admin/players/${nonExistentId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });
}); 