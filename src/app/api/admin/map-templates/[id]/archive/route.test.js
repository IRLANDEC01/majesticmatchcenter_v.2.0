import { PATCH } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';

describe('API /api/admin/map-templates/[id]/archive', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
    await MapTemplate.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await MapTemplate.deleteMany({});
    testTemplate = await MapTemplate.create({ name: 'Test Map Template for Archiving' });
  });

  it('должен успешно архивировать шаблон карты', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: testTemplate._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbTemplate = await MapTemplate.findById(testTemplate._id).setOptions({ includeArchived: true });
    expect(dbTemplate.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать шаблон карты из архива', async () => {
    await testTemplate.updateOne({ $set: { archivedAt: new Date() } });

    const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
    });

    const response = await PATCH(request, { params: { id: testTemplate._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbTemplate = await MapTemplate.findById(testTemplate._id);
    expect(dbTemplate).not.toBeNull();
    expect(dbTemplate.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если шаблон карты не найден', async () => {
    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });
}); 