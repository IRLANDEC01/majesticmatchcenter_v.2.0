import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HydratedDocument } from 'mongoose';
import { PATCH } from './route';
import { createTestTournamentTemplate, dbClear } from '@/lib/test-helpers';
import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { revalidatePath } from 'next/cache';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('PATCH /api/admin/tournament-templates/[id]/restore', () => {
  let archivedTemplate: HydratedDocument<ITournamentTemplate>;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();

    archivedTemplate = await createTestTournamentTemplate({
      name: 'Archived for Restore Test',
      archivedAt: new Date(),
    });
  });

  it('должен успешно восстанавливать шаблон из архива', async () => {
    // Arrange
    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${archivedTemplate._id.toString()}/restore`,
      {
        method: 'PATCH',
      },
    );

    // Act
    const response = await PATCH(request, { params: { id: archivedTemplate._id.toString() } });
    const restoredTemplate = await TournamentTemplate.findById(archivedTemplate._id);

    // Assert
    expect(response.status).toBe(200);
    expect(restoredTemplate?.isArchived).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 404 для несуществующего ID', async () => {
    // Arrange
    const nonExistentId = '605c72ef9f1b2c001f7b8b17';
    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${nonExistentId}/restore`,
      {
        method: 'PATCH',
      },
    );

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.message).toContain('не найден');
  });

  it('должен возвращать 409, если шаблон не находится в архиве', async () => {
    // Arrange
    const activeTemplate = await createTestTournamentTemplate({
      name: 'Active Template',
    });
    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${activeTemplate._id.toString()}/restore`,
      {
        method: 'PATCH',
      },
    );

    // Act
    const response = await PATCH(request, { params: { id: activeTemplate._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(409);
    expect(body.message).toContain('не находится в архиве');
  });
}); 