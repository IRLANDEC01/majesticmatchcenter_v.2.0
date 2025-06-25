import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { PATCH } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestMapTemplate,
} from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';
import { HydratedDocument } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';
import MapTemplate from '@/models/map/MapTemplate';
import mongoose from 'mongoose';

vi.mock('next/cache');

describe('PATCH /api/admin/map-templates/[id]/archive', () => {
  let template: HydratedDocument<IMapTemplate>;

  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    template = await createTestMapTemplate({ name: 'Template to Archive' });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  it('должен успешно архивировать шаблон карты и вызывать revalidatePath', async () => {
    const { req } = createMocks({
      method: 'PATCH',
    });
    const response = await PATCH(req, { params: { id: (template._id as mongoose.Types.ObjectId).toString() } });

    expect(response.status).toBe(200);
    const dbTemplate = await MapTemplate.findById(template._id);
    expect(dbTemplate?.archivedAt).toBeInstanceOf(Date);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
  });

  it('должен возвращать 404, если шаблон для архивации не найден', async () => {
    const { req } = createMocks({
      method: 'PATCH',
    });
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const response = await PATCH(req, { params: { id: nonExistentId } });
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409 (Conflict), если шаблон уже заархивирован', async () => {
    await template.updateOne({ archivedAt: new Date() });

    const { req } = createMocks({
      method: 'PATCH',
    });
    const response = await PATCH(req, { params: { id: (template._id as mongoose.Types.ObjectId).toString() } });
    expect(response.status).toBe(409);
  });
}); 