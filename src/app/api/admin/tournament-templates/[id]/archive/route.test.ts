import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { HydratedDocument } from 'mongoose';
import { PATCH } from './route';
import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  createTestTournamentTemplate,
} from '@/lib/test-helpers';
import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { revalidatePath } from 'next/cache';

import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('PATCH /api/admin/tournament-templates/[id]/archive', () => {
  beforeAll(async () => {
    await connectToTestDB();
    await clearTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  it('должен успешно архивировать шаблон и вызывать revalidatePath', async () => {
    const activeTemplate = await createTestTournamentTemplate({ name: 'Template to Archive' });
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${activeTemplate.id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request as any, { params: { id: activeTemplate.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Template to Archive');

    const archivedTemplate = await TournamentTemplate.findById(activeTemplate.id);
    expect(archivedTemplate?.archivedAt).toBeInstanceOf(Date);
    expect(body.data.archivedAt).toBeDefined();

    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${activeTemplate.id}`);
  });

  it('должен возвращать 409, если шаблон уже в архиве', async () => {
    const archivedTemplate = await createTestTournamentTemplate({ 
      name: 'Already Archived Template',
      archivedAt: new Date()
    });
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${archivedTemplate.id}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request as any, { params: { id: archivedTemplate.id } });

    expect(response.status).toBe(409);
  });

  it('должен возвращать 404 для несуществующего ID', async () => {
    const nonExistentId = '605c72ef9f1b2c001f7b8b17';
    const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}/archive`, {
      method: 'PATCH',
    });

    const response = await PATCH(request as any, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
  });
}); 