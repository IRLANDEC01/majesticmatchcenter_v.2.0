import { createMocks } from 'node-mocks-http';
import { PATCH } from './route';
import Player from '@/models/player/Player';
import { playerService } from '@/lib/domain/players/player-service';

describe('API /api/admin/players/[id]/archive', () => {
  let testPlayer;

  beforeAll(async () => {
    await Player.init();
  });

  beforeEach(async () => {
    testPlayer = await Player.create({
      firstName: 'TestArchivePlayer',
      lastName: 'Test',
    });
  });

  afterEach(async () => {
    await Player.deleteMany({});
  });

  it('должен успешно архивировать игрока', async () => {
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const response = await PATCH(req, { params: { id: testPlayer._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbPlayer = await Player.findById(testPlayer._id);
    expect(dbPlayer.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать игрока из архива', async () => {
    await testPlayer.updateOne({ $set: { archivedAt: new Date() } });

    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: false },
    });

    const response = await PATCH(req, { params: { id: testPlayer._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbPlayer = await Player.findById(testPlayer._id);
    expect(dbPlayer).not.toBeNull();
    expect(dbPlayer.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если игрок не найден', async () => {
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const response = await PATCH(req, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });

  it('должен возвращать 404 при попытке заархивировать уже архивированного игрока', async () => {
    await playerService.archivePlayer(testPlayer._id.toString());
    
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const response = await PATCH(req, { params: { id: testPlayer._id.toString() } });
    expect(response.status).toBe(404);
  });
}); 