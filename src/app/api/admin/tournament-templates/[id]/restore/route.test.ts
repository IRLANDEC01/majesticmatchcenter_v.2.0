import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { PATCH } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestTournamentTemplate,
} from '@/lib/test-helpers.js';
import { revalidatePath } from 'next/cache';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import { clearMemoryCache } from '@/lib/cache';

vi.mock('next/cache');

describe('PATCH /api/admin/tournament-templates/[id]/restore', () => {
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

  it('должен успешно восстанавливать шаблон из архива', async () => {
    const template = await createTestTournamentTemplate({ name: 'Template to restore', isArchived: true, tournamentTemplateImage: 'https://example.com/image15.png' });
    const req = new Request(`http://localhost/api/admin/tournament-templates/${template.id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(req as any, { params: { id: template.id.toString() } });
    const body = await response.json();

    const restoredTemplate = await TournamentTemplate.findById(template._id);

    expect(response.status).toBe(200);
    expect(restoredTemplate?.archivedAt).toBeNull();
    expect(body.data.archivedAt).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${template.id}`);
  });

  it('должен возвращать 404 для несуществующего ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const req = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });
    const response = await PATCH(req as any, { params: { id: nonExistentId.toString() } });
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409, если шаблон не находится в архиве', async () => {
    const template = await createTestTournamentTemplate({ name: 'Not Archived', tournamentTemplateImage: 'https://example.com/image16.png' });
    const req = new Request(`http://localhost/api/admin/tournament-templates/${template.id}/restore`, {
      method: 'PATCH',
    });
    const response = await PATCH(req as any, { params: { id: template.id.toString() } });
    expect(response.status).toBe(409);
  });
}); 