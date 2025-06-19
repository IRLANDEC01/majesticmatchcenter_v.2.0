import { PATCH } from './route';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import { TOURNAMENT_SCORING_TYPES } from '@/lib/constants';

describe('API /api/admin/tournament-templates/[id]/archive', () => {
  let testTemplate;
  let mapTemplate;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    mapTemplate = await MapTemplate.create({ name: 'Test Map for Archiving', slug: 'test-map-for-archiving' });
    testTemplate = await TournamentTemplate.create({
      name: 'Test Template for Archiving',
      slug: 'test-template-for-archiving',
      mapTemplates: [mapTemplate._id],
      scoringType: TOURNAMENT_SCORING_TYPES.LEADERBOARD,
    });
  });

  it('должен успешно архивировать шаблон', async () => {
    const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: testTemplate._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbTemplate = await TournamentTemplate.findById(testTemplate._id).setOptions({ includeArchived: true });
    expect(dbTemplate.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать шаблон из архива', async () => {
    await testTemplate.updateOne({ $set: { archivedAt: new Date() } });

    const request = new Request(`http://localhost/api/admin/tournament-templates/${testTemplate._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
    });

    const response = await PATCH(request, { params: { id: testTemplate._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbTemplate = await TournamentTemplate.findById(testTemplate._id);
    expect(dbTemplate).not.toBeNull();
    expect(dbTemplate.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если шаблон не найден', async () => {
    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });
}); 