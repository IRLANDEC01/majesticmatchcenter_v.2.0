import { PATCH } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import MapTemplate from '@/models/map/MapTemplate.ts';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('PATCH /api/admin/map-templates/[id]/restore', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  it('должен успешно восстанавливать шаблон и вызывать revalidatePath', async () => {
    // Arrange
    const template = await MapTemplate.create({
      name: 'Template to restore',
      mapTemplateImage: 'path/to/image.jpg',
      archivedAt: new Date(),
    });
    
    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const body = await response.json();
    const updatedTemplate = await MapTemplate.findById(template._id).lean();

    // Assert
    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeNull();
    expect(updatedTemplate.archivedAt).toBeNull();
    
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId } });

    // Assert
    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('должен возвращать 409 (Conflict), если шаблон не находится в архиве', async () => {
    // Arrange
    const template = await MapTemplate.create({
      name: 'Not archived template',
      mapTemplateImage: 'path/to/image.jpg',
      archivedAt: null,
    });
    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });

    // Assert
    expect(response.status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 