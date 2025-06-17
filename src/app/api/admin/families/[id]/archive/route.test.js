import { createMocks } from 'node-mocks-http';
import { PATCH } from './route';
import Family from '@/models/family/Family';
import { familyService } from '@/lib/domain/families/family-service';

describe('API /api/admin/families/[id]/archive', () => {
  let testFamily;

  beforeAll(async () => {
    await Family.init();
  });

  beforeEach(async () => {
    testFamily = await Family.create({
      name: `TestArchiveFamily`,
      displayLastName: 'Test'
    });
  });

  afterEach(async () => {
    await Family.deleteMany({});
  });

  it('должен успешно архивировать семью', async () => {
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const response = await PATCH(req, { params: { id: testFamily._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbFamily = await Family.findById(testFamily._id);
    expect(dbFamily.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать семью из архива', async () => {
    await testFamily.updateOne({ $set: { archivedAt: new Date() } });

    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: false },
    });

    const response = await PATCH(req, { params: { id: testFamily._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined();

    const dbFamily = await Family.findById(testFamily._id);
    expect(dbFamily).not.toBeNull();
    expect(dbFamily.archivedAt).toBeUndefined();
  });

  it('должен возвращать 404, если семья не найдена', async () => {
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const response = await PATCH(req, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });

  it('должен возвращать 404 при попытке заархивировать уже архивированную семью', async () => {
    await familyService.archiveFamily(testFamily._id.toString());
    
    const { req } = createMocks({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { archived: true },
    });

    const response = await PATCH(req, { params: { id: testFamily._id.toString() } });
    expect(response.status).toBe(404);
  });
}); 