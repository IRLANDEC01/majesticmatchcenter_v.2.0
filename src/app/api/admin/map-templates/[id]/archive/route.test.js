import { PATCH } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import { revalidatePath } from 'next/cache';

// Мокируем 'next/cache' для всех тестов в этом файле
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('PATCH /api/admin/map-templates/[id]/archive', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    jest.clearAllMocks();
  });

  it('должен успешно архивировать шаблон карты и вызывать revalidatePath', async () => {
    // Arrange
    const template = await MapTemplate.create({ name: 'Template to Archive' });
    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/archive`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const updatedTemplate = await MapTemplate.findById(template._id);

    // Assert
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.archivedAt).toBeDefined();

    expect(updatedTemplate.archivedAt).not.toBeNull();

    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 404, если шаблон для архивации не найден', async () => {
    // Arrange
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/archive`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId } });

    // Assert
    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  // Дополнительный тест на бизнес-логику
  it('должен возвращать 409 (Conflict), если шаблон уже заархивирован', async () => {
    // Arrange
    const template = await MapTemplate.create({
      name: 'Already Archived',
      archivedAt: new Date(),
    });
    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/archive`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });

    // Assert
    expect(response.status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});