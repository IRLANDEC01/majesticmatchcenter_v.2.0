import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PATCH } from './route';
import MapTemplate from '@/models/map/MapTemplate';
import { revalidatePath } from 'next/cache';
import { dbClear } from '@/lib/test-helpers';
import { HydratedDocument } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('PATCH /api/admin/map-templates/[id]/restore', () => {
  let template: HydratedDocument<IMapTemplate>;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();
    template = await MapTemplate.create({
      name: 'Template to restore',
      mapTemplateImage: 'path/to/image.jpg',
      archivedAt: new Date(),
    });
  });

  it('должен успешно восстанавливать шаблон и вызывать revalidatePath', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const body = await response.json();
    const updatedTemplate = await MapTemplate.findById(template._id);

    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeNull();
    expect(updatedTemplate!.archivedAt).toBeNull();

    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const request = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('должен возвращать 409 (Conflict), если шаблон не находится в архиве', async () => {
    await template.updateOne({ archivedAt: null });

    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: template._id.toString() } });

    expect(response.status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 