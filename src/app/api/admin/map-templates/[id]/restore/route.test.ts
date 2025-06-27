import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { PATCH } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import MapTemplate from '@/models/map/MapTemplate';
import { clearMemoryCache } from '@/lib/cache';

vi.mock('next/cache');

describe('PATCH /api/admin/map-templates/[id]/restore', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await clearMemoryCache();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  it('должен успешно восстанавливать шаблон карты и вызывать revalidatePath', async () => {
    const template = await createTestMapTemplate({ name: 'Template to restore', isArchived: true });
    const templateId = template.id.toString();
    const req = new Request(`http://localhost/api/admin/map-templates/${templateId}/restore`, {
      method: 'PATCH',
    });

    const params = Promise.resolve({ id: templateId });
    const response = await PATCH(req as any, { params });

    expect(response.status).toBe(200);
    const dbTemplate = await MapTemplate.findById(template._id);
    expect(dbTemplate?.archivedAt).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${templateId}`);
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const req = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });
    const params = Promise.resolve({ id: nonExistentId.toString() });
    const response = await PATCH(req as any, { params });
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409 (Conflict), если шаблон не находится в архиве', async () => {
    const template = await createTestMapTemplate({ name: 'Not Archived' });
    const templateId = template.id.toString();
    const req = new Request(`http://localhost/api/admin/map-templates/${templateId}/restore`, {
      method: 'PATCH',
    });
    const params = Promise.resolve({ id: templateId });
    const response = await PATCH(req as any, { params });
    expect(response.status).toBe(409);
  });
});
