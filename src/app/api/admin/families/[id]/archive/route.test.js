import { PATCH } from './route';
import Family from '@/models/family/Family';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import { familyService } from '@/lib/domain/families/family-service';

describe('API /api/admin/families/[id]/archive', () => {
  let testFamily;

  beforeAll(async () => {
    await connectToDatabase();
    await Family.init();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await Family.deleteMany({});
    testFamily = await Family.create({ name: 'Test Family for Archiving', displayLastName: 'Archive' });
  });

  it('должен успешно архивировать семью', async () => {
    const request = new Request(`http://localhost/api/admin/families/${testFamily._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: testFamily._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbFamily = await Family.findById(testFamily._id).setOptions({ includeArchived: true });
    expect(dbFamily.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать семью из архива', async () => {
    await testFamily.updateOne({ $set: { archivedAt: new Date() } });

    const request = new Request(`http://localhost/api/admin/families/${testFamily._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
    });

    const response = await PATCH(request, { params: { id: testFamily._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbFamily = await Family.findById(testFamily._id);
    expect(dbFamily).not.toBeNull();
    expect(dbFamily.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если семья не найдена', async () => {
    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const request = new Request(`http://localhost/api/admin/families/${nonExistentId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });

  it('должен возвращать 404 при попытке заархивировать уже архивированную семью', async () => {
    await familyService.archiveFamily(testFamily._id.toString());
    
    const request = new Request(`http://localhost/api/admin/families/${testFamily._id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
    });

    const response = await PATCH(request, { params: { id: testFamily._id.toString() } });
    expect(response.status).toBe(404);
  });
}); 