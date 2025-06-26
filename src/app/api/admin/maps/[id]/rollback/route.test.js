import { POST } from './route.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import { STATUSES } from '@/lib/constants';
import Map from '@/models/map/Map.js';
import { vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('POST /api/admin/maps/[id]/rollback', () => {
  let mapToComplete;

  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await dbDisconnect();
  });
  
  beforeEach(async () => {
    await dbClear();
    const { testData } = await populateDb({
      maps: [{
        status: STATUSES.COMPLETED,
        // Мы можем добавить сюда другие данные, если они нужны для теста
      }]
    });
    mapToComplete = testData.map;
    revalidatePath.mockClear();
  });

  it('должен откатить завершение карты и вернуть 200', async () => {
    // Для этого теста карта УЖЕ должна быть в статусе COMPLETED.
    // Мы это сделали в populateDb, но для чистоты теста можно проверить.
    const initialMap = await Map.findById(mapToComplete._id).setOptions({ includeArchived: true });
    initialMap.status = STATUSES.COMPLETED;
    await initialMap.save();

    const req = new Request(`http://localhost/api/admin/maps/${mapToComplete._id}/rollback`, {
      method: 'POST',
    });
    
    const response = await POST(req, { params: { id: mapToComplete._id.toString() } });
    expect(response.status).toBe(200);

    const updatedMap = await Map.findById(mapToComplete._id);
    expect(updatedMap.status).toBe(STATUSES.ACTIVE); 
    expect(updatedMap.winner).toBeNull();
    expect(updatedMap.mvp).toBeNull();
    
    expect(revalidatePath).toHaveBeenCalledWith('/admin/maps');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/maps/${mapToComplete._id}`);
  });

  it('должен вернуть 409, если карта не в статусе "completed"', async () => {
    // Для этого теста карта должна быть в статусе ACTIVE
    const map = await Map.findById(mapToComplete._id).setOptions({ includeArchived: true });
    map.status = STATUSES.ACTIVE;
    await map.save();
    
    const req = new Request(`http://localhost/api/admin/maps/${mapToComplete._id}/rollback`, {
      method: 'POST',
    });
    
    const response = await POST(req, { params: { id: mapToComplete._id.toString() } });
    expect(response.status).toBe(409);
  });
  
  it('должен вернуть 404, если карта не найдена', async () => {
    const nonExistentId = '605c72ef9e4e6b3b4c8b4567';
    const req = new Request(`http://localhost/api/admin/maps/${nonExistentId}/rollback`, {
      method: 'POST',
    });

    const response = await POST(req, { params: { id: nonExistentId } });
    expect(response.status).toBe(404);
  });
}); 