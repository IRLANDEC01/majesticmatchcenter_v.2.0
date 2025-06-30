import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
// import mongoose from 'mongoose';
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

describe('PATCH /api/admin/tournament-templates/[id]/archive', () => {
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

  it('должен успешно архивировать шаблон и вызывать revalidatePath', async () => {
    const template = await createTestTournamentTemplate({ name: 'Template to archive', tournamentTemplateImage: 'https://example.com/image13.png' });
    const req = new Request(`http://localhost/api/admin/tournament-templates/${template.id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(req as any, { params: { id: template.id.toString() } });

    expect(response.status).toBe(200);
    const dbTemplate = await TournamentTemplate.findById(template._id);
    expect(dbTemplate?.archivedAt).toBeInstanceOf(Date);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${template.id}`);
  });

  it('должен возвращать 404 для несуществующего ID', async () => {
    const nonExistentId = '605c72ef9f1b2c001f7b8b17';
    const req = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}/archive`, {
      method: 'PATCH',
    });
    const response = await PATCH(req as any, { params: { id: nonExistentId.toString() } });
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409, если шаблон уже в архиве', async () => {
    const template = await createTestTournamentTemplate({
      name: 'Already Archived',
      isArchived: true,
      tournamentTemplateImage: 'https://example.com/image14.png',
    });
    const req = new Request(`http://localhost/api/admin/tournament-templates/${template.id}/archive`, {
      method: 'PATCH',
    });
    const response = await PATCH(req as any, { params: { id: template.id.toString() } });
    expect(response.status).toBe(409);
  });
}); 