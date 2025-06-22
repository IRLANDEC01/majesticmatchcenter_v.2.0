import { PATCH } from './route';
import Map from '@/models/map/Map';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers';

describe('API /api/admin/maps/[id]/archive', () => {
  let testMap;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    const { testData } = await populateDb();
    testMap = testData.map;
  });

  it('должен успешно архивировать карту', async () => {
    const request = new Request(`http://localhost/api/admin/maps/${testMap._id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: testMap._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    const dbMap = await Map.findById(testMap._id).setOptions({ includeArchived: true });
    expect(dbMap.archivedAt).toBeDefined();
  });

  it('должен успешно восстанавливать карту из архива', async () => {
    // Сначала архивируем
    await Map.findByIdAndUpdate(testMap._id, { $set: { archivedAt: new Date() } });

    const request = new Request(`http://localhost/api/admin/maps/${testMap._id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: testMap._id.toString() } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeUndefined(); // Восстановленная карта не должна иметь этого поля

    const dbMap = await Map.findById(testMap._id);
    expect(dbMap).not.toBeNull();
    expect(dbMap.archivedAt).toBeNull();
  });

  it('должен возвращать 404, если карта не найдена', async () => {
    const nonExistentId = '60c72b2f9b1d8e001f8e4c5e';
    const request = new Request(`http://localhost/api/admin/maps/${nonExistentId}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });
    
    expect(response.status).toBe(404);
  });
}); 