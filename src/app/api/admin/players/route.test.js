import { POST, GET } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import Player from '@/models/player/Player.js';
import PlayerStats from '@/models/player/PlayerStats.js';
import playerRepo from '@/lib/repos/players/player-repo';
import { StatusCodes } from 'http-status-codes';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('API /api/admin/players', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  describe('POST /api/admin/players', () => {
    it('должен успешно создавать игрока и статистику', async () => {
      const playerData = { firstName: 'Test', lastName: 'Player' };
      // Клонируем объект Request для безопасного чтения body
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      const response = await POST(request.clone());
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.firstName).toBe('Test');
      const dbPlayer = await Player.findById(body._id);
      const dbStats = await PlayerStats.findOne({ playerId: body._id });
      expect(dbPlayer).not.toBeNull();
      expect(dbStats).not.toBeNull();
    });
  });

  describe('GET /api/admin/players', () => {
    it('должен возвращать только архивных игроков при `status=archived`', async () => {
      // ИСПРАВЛЕНИЕ: Убраны пробелы в firstName
      await Player.create({ firstName: 'ActivePlayer', lastName: 'Test' });
      const p2 = await Player.create({ firstName: 'ArchivedPlayer', lastName: 'Testtwo' });
      await playerRepo.archive(p2._id);

      const request = new Request('http://localhost/api/admin/players?status=archived');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].firstName).toBe('ArchivedPlayer');
    });
  });
});