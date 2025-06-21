import { PATCH } from './route';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { dbClear } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/map-templates/[id]/archive', () => {
  let testTemplate;

  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await dbClear();
    testTemplate = await MapTemplate.create({
      name: 'Archivable Template',
      description: 'A test description',
      mapImage: '/placeholders/default-map.jpg',
    });
    revalidatePath.mockClear();
  });

  it('должен успешно архивировать шаблон карты и вызывать revalidatePath', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${testTemplate._id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: testTemplate._id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeDefined();

    // Проверяем, что revalidatePath была вызвана
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');

    const dbTemplate = await MapTemplate.findById(testTemplate._id).setOptions({ includeArchived: true });
    expect(dbTemplate.archivedAt).toBeDefined();
  });

  it('должен возвращать 404, если шаблон для архивации не найден', async () => {
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/archive`, {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 