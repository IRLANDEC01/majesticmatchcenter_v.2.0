import { GET, POST } from './route';
import Player from '@/models/player/Player';
import PlayerStats from '@/models/player/PlayerStats';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/players', () => {
  beforeAll(async () => {
    await connectToDatabase();
    await Player.init();
    await PlayerStats.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Player.deleteMany({});
    await PlayerStats.deleteMany({});
  });

  describe('POST', () => {
    it('должен успешно создавать игрока, связанную статистику и возвращать 201', async () => {
      const playerData = { firstName: 'John', lastName: 'Doe' };
      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.firstName).toBe(playerData.firstName);
      expect(body.slug).toBe('john-doe');
      
      const dbPlayer = await Player.findById(body._id);
      expect(dbPlayer).not.toBeNull();
      
      const dbStats = await PlayerStats.findOne({ playerId: body._id });
      expect(dbStats).not.toBeNull();
      if (dbStats) {
        expect(dbStats.playerId.toString()).toBe(body._id.toString());
        expect(dbStats.overall.kills).toBe(0);
      }
    });

    it('должен возвращать 409 при попытке создать дубликат по имени и фамилии', async () => {
      const playerData = { firstName: 'Jane', lastName: 'Doe' };
      await Player.create(playerData);

      const request = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированных игроков по умолчанию', async () => {
      await Player.create({ firstName: 'Active', lastName: 'Player' });
      await Player.create({ firstName: 'Archived', lastName: 'Player', archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/players');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].firstName).toBe('Active');
    });

    it('должен возвращать всех игроков при `include_archived=true`', async () => {
      await Player.create({ firstName: 'ActivePlayer', lastName: 'Two' });
      await Player.create({ firstName: 'ArchivedPlayer', lastName: 'Two', archivedAt: new Date() });

      const url = new URL('http://localhost/api/admin/players');
      url.searchParams.set('include_archived', 'true');
      const request = new Request(url);
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 