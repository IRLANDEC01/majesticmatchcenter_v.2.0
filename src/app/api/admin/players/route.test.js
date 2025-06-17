import { createMocks } from 'node-mocks-http';
import { GET, POST } from './route';
import Player from '@/models/player/Player';

describe('API /api/admin/players', () => {
  beforeAll(async () => {
    await Player.init();
  });

  describe('GET', () => {
    it('должен возвращать пустой массив, если игроков нет', async () => {
      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    it('должен возвращать список игроков и статус 200', async () => {
      await Player.create({ firstName: 'John', lastName: 'Doe' });
      await Player.create({ firstName: 'Jane', lastName: 'Doe' });

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
    });
  });

  describe('POST', () => {
    it('должен создавать игрока и возвращать 201', async () => {
      const newPlayerData = { firstName: 'New', lastName: 'Player' };
      
      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: newPlayerData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.firstName).toBe(newPlayerData.firstName);
      expect(body.lastName).toBe(newPlayerData.lastName);

      const dbPlayer = await Player.findById(body._id);
      expect(dbPlayer).not.toBeNull();
    });

    it('должен возвращать 400 при невалидных данных', async () => {
      const invalidData = { firstName: 'NoLastName' };
      
      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: invalidData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.lastName).toBeDefined();
    });

    it('должен возвращать 409 при дубликате', async () => {
      const playerData = { firstName: 'Duplicate', lastName: 'Player' };
      await Player.create(playerData);

      const { req } = createMocks({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: playerData,
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toContain('уже существует');
    });
  });
}); 