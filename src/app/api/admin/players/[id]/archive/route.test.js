import { PATCH } from './route';
import Player from '@/models/player/Player';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/players/[id]/archive', () => {
  let testPlayer;

  beforeAll(async () => {
    await connectToDatabase();
    await Player.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Player.deleteMany({});
    testPlayer = await Player.create({
      firstName: 'Test',
      lastName: 'Player',
      nickname: 'Archiver',
      email: 'archive@test.com',
    });
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