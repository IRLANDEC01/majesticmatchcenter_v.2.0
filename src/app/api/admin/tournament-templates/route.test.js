import { GET, POST } from './route';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/tournament-templates', () => {
  let mapTemplate;

  beforeAll(async () => {
    await connectToDatabase();
    await TournamentTemplate.init();
    await MapTemplate.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await TournamentTemplate.deleteMany({});
    await MapTemplate.deleteMany({});
    mapTemplate = await MapTemplate.create({ name: 'Test Map Template' });
  });

  describe('POST', () => {
    it('должен успешно создавать шаблон и возвращать 201', async () => {
      const templateData = { 
        name: 'New Tournament Template',
        mapTemplates: [mapTemplate._id.toString()],
      };
      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(templateData.name);
      expect(body.slug).toBe('new-tournament-template');
      
      const dbTemplate = await TournamentTemplate.findById(body._id);
      expect(dbTemplate).not.toBeNull();
      expect(dbTemplate.mapTemplates.length).toBe(1);
    });

    it('должен возвращать 409 при попытке создать дубликат', async () => {
      const templateData = { 
        name: 'Duplicate Template',
        mapTemplates: [mapTemplate._id.toString()],
      };
      await TournamentTemplate.create(templateData);

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные шаблоны по умолчанию', async () => {
      await TournamentTemplate.create({ name: 'Active Template', mapTemplates: [mapTemplate._id] });
      await TournamentTemplate.create({ name: 'Archived Template', archivedAt: new Date(), mapTemplates: [mapTemplate._id] });

      const request = new Request('http://localhost/api/admin/tournament-templates');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('Active Template');
    });

    it('должен возвращать все шаблоны при `include_archived=true`', async () => {
      await TournamentTemplate.create({ name: 'Active Template 2', mapTemplates: [mapTemplate._id] });
      await TournamentTemplate.create({ name: 'Archived Template 2', archivedAt: new Date(), mapTemplates: [mapTemplate._id] });

      const url = new URL('http://localhost/api/admin/tournament-templates');
      url.searchParams.set('include_archived', 'true');
      const request = new Request(url);
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.length).toBe(2);
    });
  });
}); 