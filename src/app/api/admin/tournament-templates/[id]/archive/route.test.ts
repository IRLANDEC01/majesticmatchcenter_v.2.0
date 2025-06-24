import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HydratedDocument } from 'mongoose';
import { PATCH } from './route';
import { createTestTournamentTemplate, dbClear } from '@/lib/test-helpers';
import TournamentTemplate, { ITournamentTemplate } from '@/models/tournament/TournamentTemplate';
import { revalidatePath } from 'next/cache';

import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('PATCH /api/admin/tournament-templates/[id]/archive', () => {
  let template: HydratedDocument<ITournamentTemplate>;

  beforeEach(async () => {
    await dbClear();
    vi.mocked(revalidatePath).mockClear();

    // Создаем шаблон и явно утверждаем его тип
    template = await createTestTournamentTemplate({ name: 'Template to Archive' });
  });

  it('должен успешно архивировать шаблон и вызывать revalidatePath', async () => {
    // Arrange
    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${template._id.toString()}/archive`,
      {
        method: 'PATCH',
      },
    );

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });

    // Assert
    expect(response.status).toBe(200);

    const archivedTemplate = await TournamentTemplate.findById(template._id);
    expect(archivedTemplate?.isArchived).toBe(true);
    expect(archivedTemplate?.archivedAt).toBeInstanceOf(Date);

    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 409, если шаблон уже в архиве', async () => {
    // Arrange: first, archive the template
    await tournamentTemplateRepo.archive(template._id.toString());

    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${template._id.toString()}/archive`,
      {
        method: 'PATCH',
      },
    );

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(409);
    expect(body.message).toContain('уже находится в архиве');
  });

  it('должен возвращать 404 для несуществующего ID', async () => {
    // Arrange
    const nonExistentId = '605c72ef9f1b2c001f7b8b17';
    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${nonExistentId}/archive`,
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
}); 