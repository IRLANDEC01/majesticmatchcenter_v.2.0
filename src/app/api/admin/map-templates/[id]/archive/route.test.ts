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

describe('PATCH /api/admin/map-templates/[id]/archive', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
     clearMemoryCache();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  it('должен успешно архивировать шаблон карты и вызывать revalidatePath', async () => {
    const template = await createTestMapTemplate({ name: 'Template to archive' });
    const templateId = template.id.toString();
    const req = new Request(`http://localhost/api/admin/map-templates/${templateId}/archive`, {
      method: 'PATCH',
    });

    const params = Promise.resolve({ id: templateId });
    const response = await PATCH(req as any, { params });

    expect(response.status).toBe(200);
    const dbTemplate = await MapTemplate.findById(template._id);
    expect(dbTemplate?.archivedAt).toBeInstanceOf(Date);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/map-templates/${templateId}`);
  });

  it('должен возвращать 404, если шаблон для архивации не найден', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const req = new Request(`http://localhost/api/admin/map-templates/${nonExistentId}/archive`, {
      method: 'PATCH',
    });
    const params = Promise.resolve({ id: nonExistentId.toString() });
    const response = await PATCH(req as any, { params });
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409 (Conflict), если шаблон уже заархивирован', async () => {
    const template = await createTestMapTemplate({
      name: 'Already Archived',
      isArchived: true,
    });
    const templateId = template.id.toString();
    const req = new Request(`http://localhost/api/admin/map-templates/${templateId}/archive`, {
      method: 'PATCH',
    });
    const params = Promise.resolve({ id: templateId });
    const response = await PATCH(req as any, { params });
    expect(response.status).toBe(409);
  });
});
