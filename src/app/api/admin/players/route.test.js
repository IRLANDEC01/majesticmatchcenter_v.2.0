import { POST, GET } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import models from '@/models';

const { Player, PlayerStats } = models;

describe('API /api/admin/players', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(dbClear);

  describe('POST /api/admin/players', () => {
    it('должен успешно создавать игрока и возвращать 201', async () => {
      const playerData = {
        firstName: 'Test',
        lastName: 'Player',
        bio: 'A test bio',
      };
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.firstName).toBe('Test');
      const dbPlayer = await Player.findById(body._id);
      expect(dbPlayer).not.toBeNull();
      // Проверяем, что статистика тоже создалась (если это логика сервиса)
      const dbStats = await PlayerStats.findOne({ playerId: body._id });
      expect(dbStats).not.toBeNull();
    });

    it('должен возвращать 400, если не передано имя', async () => {
      const playerData = { lastName: 'NoFirstName' };
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors.firstName).toBeDefined();
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      // Сначала создаем игрока
      await Player.create({ firstName: 'Duplicate', lastName: 'Player' });

      // Пытаемся создать еще одного с теми же данными
      const duplicateData = { firstName: 'Duplicate', lastName: 'Player' };
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.message).toContain('уже существует');
    });
  });

  describe('GET /api/admin/players', () => {
    beforeEach(async () => {
      await Player.create([
        { firstName: 'Active', lastName: 'Player' },
        { firstName: 'Archived', lastName: 'Player', archivedAt: new Date() },
      ]);
    });

    it('должен возвращать только неархивированных игроков', async () => {
      const request = new Request('http://localhost/api/admin/players');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].firstName).toBe('Active');
    });

    it('должен возвращать всех игроков при `include_archived=true`', async () => {
      const request = new Request('http://localhost/api/admin/players?include_archived=true');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 