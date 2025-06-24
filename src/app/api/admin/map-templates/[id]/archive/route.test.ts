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

describe('PATCH /api/admin/map-templates/[id]/archive', () => {
  let template: HydratedDocument<IMapTemplate>;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();
    template = await MapTemplate.create({
      name: 'Template to archive',
      mapTemplateImage: 'path/to/image.jpg',
    });
  });

  it('должен успешно архивировать шаблон карты и вызывать revalidatePath', async () => {
    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const updatedTemplate = await MapTemplate.findById(template._id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.archivedAt).toBeDefined();
    expect(updatedTemplate!.archivedAt).not.toBeNull();

    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
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

  it('должен возвращать 409 (Conflict), если шаблон уже заархивирован', async () => {
    await template.updateOne({ archivedAt: new Date() });

    const request = new Request(`http://localhost/api/admin/map-templates/${template._id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: { id: template._id.toString() } });

    expect(response.status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
}); 