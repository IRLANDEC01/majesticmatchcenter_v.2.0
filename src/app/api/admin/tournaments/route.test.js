import { GET, POST } from './route';
import Tournament from '@/models/tournament/Tournament';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/tournaments', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
    await Tournament.init();
    await TournamentTemplate.init();
    await MapTemplate.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Tournament.deleteMany({});
    await TournamentTemplate.deleteMany({});
    await MapTemplate.deleteMany({});
    const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
    testTemplate = await TournamentTemplate.create({ name: 'Test Template', mapTemplates: [mapTemplate._id] });
  });

  describe('POST', () => {
    it('должен успешно создавать турнир и возвращать 201', async () => {
      const tournamentData = {
        name: 'New Tournament',
        template: testTemplate._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
      };
      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(tournamentData.name);
      
      const dbTournament = await Tournament.findById(body._id);
      expect(dbTournament).not.toBeNull();
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      const tournamentData = {
        name: 'Duplicate Tournament',
        template: testTemplate._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
      };
      await Tournament.create(tournamentData);

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные турниры по умолчанию', async () => {
      await Tournament.create({ name: 'Active Tournament', template: testTemplate._id, tournamentType: 'family', startDate: new Date() });
      await Tournament.create({ name: 'Archived Tournament', template: testTemplate._id, tournamentType: 'family', startDate: new Date(), archivedAt: new Date() });

      const request = new Request('http://localhost/api/admin/tournaments');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('Active Tournament');
    });

    it('должен возвращать все турниры при `include_archived=true`', async () => {
        await Tournament.create({ name: 'Active Tournament 2', template: testTemplate._id, tournamentType: 'family', startDate: new Date() });
        await Tournament.create({ name: 'Archived Tournament 2', template: testTemplate._id, tournamentType: 'family', startDate: new Date(), archivedAt: new Date() });
  
        const url = new URL('http://localhost/api/admin/tournaments');
        url.searchParams.set('include_archived', 'true');
        const request = new Request(url);
        
        const response = await GET(request);
        const body = await response.json();
  
        expect(response.status).toBe(200);
        expect(body.length).toBe(2);
      });
  });
});
