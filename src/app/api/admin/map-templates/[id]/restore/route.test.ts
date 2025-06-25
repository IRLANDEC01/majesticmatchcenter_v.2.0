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

describe('PATCH /api/admin/map-templates/[id]/restore', () => {
  let template: HydratedDocument<IMapTemplate>;

  beforeAll(async () => {
    await connectToTestDB();
  });

  beforeEach(async () => {
    template = await createTestMapTemplate({ name: 'Template to Restore', archivedAt: new Date() });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  it('должен успешно восстанавливать шаблон карты и вызывать revalidatePath', async () => {
    const { req } = createMocks({
      method: 'PATCH',
    });
    const response = await PATCH(req, { params: { id: (template._id as mongoose.Types.ObjectId).toString() } });

    expect(response.status).toBe(200);
    const dbTemplate = await MapTemplate.findById(template._id);
    expect(dbTemplate?.archivedAt).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/map-templates');
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    const { req } = createMocks({
      method: 'PATCH',
    });
    const nonExistentId = '605c72a6b579624e50a9d8e1';
    const response = await PATCH(req, { params: { id: nonExistentId } });
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409 (Conflict), если шаблон не находится в архиве', async () => {
    // Создаем активный шаблон
    const activeTemplate = await createTestMapTemplate({ name: 'Active Template' });

    const { req } = createMocks({
      method: 'PATCH',
    });
    const response = await PATCH(req, {
      params: { id: (activeTemplate._id as mongoose.Types.ObjectId).toString() },
    });
    expect(response.status).toBe(409);
  });
}); 