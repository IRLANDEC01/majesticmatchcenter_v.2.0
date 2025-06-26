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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('PATCH /api/admin/tournament-templates/[id]/restore', () => {
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

  it('должен успешно восстанавливать шаблон из архива', async () => {
    const archivedTemplate = await createTestTournamentTemplate({
      name: 'Archived for Restore Test',
      archivedAt: new Date(),
    });
    
    // Arrange
    const request = new Request(`http://localhost/api/admin/tournament-templates/${archivedTemplate.id}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request as any, { params: { id: archivedTemplate.id } });
    const body = await response.json();
    const restoredTemplate = await TournamentTemplate.findById(archivedTemplate.id);

    // Assert
    expect(response.status).toBe(200);
    expect(restoredTemplate?.archivedAt).toBeNull();
    expect(body.data.archivedAt).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/tournament-templates/${archivedTemplate.id}`);
  });

  it('должен возвращать 404 для несуществующего ID', async () => {
    const nonExistentId = '605c72ef9f1b2c001f7b8b17';
    const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request as any, { params: { id: nonExistentId } });

    expect(response.status).toBe(404);
  });

  it('должен возвращать 409, если шаблон не находится в архиве', async () => {
    const activeTemplate = await createTestTournamentTemplate({
      name: 'Active Template',
    });
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${activeTemplate.id}/restore`, {
      method: 'PATCH',
    });

    const response = await PATCH(request as any, { params: { id: activeTemplate.id } });

    expect(response.status).toBe(409);
  });
}); 