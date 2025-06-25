import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
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
  let template: HydratedDocument<ITournamentTemplate>;

  beforeAll(async () => {
    await connectToTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectFromTestDB();
  });

  beforeEach(async () => {
    template = await createTestTournamentTemplate({ name: 'Template to Archive' });
  });

  it('должен успешно архивировать шаблон и вызывать revalidatePath', async () => {
    // Arrange
    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${template.id}/archive`,
      {
        method: 'PATCH',
      }
    );

    // Act
    const response = await PATCH(request as any, { params: { id: template.id } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);

    const archivedTemplate = await TournamentTemplate.findById(template.id);
    expect(archivedTemplate?.archivedAt).toBeInstanceOf(Date);
    expect(body.data.archivedAt).toBeDefined();

    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 409, если шаблон уже в архиве', async () => {
    // Arrange: first, archive the template
    await tournamentTemplateRepo.archive(template.id);

    const request = new Request(
      `http://localhost/api/admin/tournament-templates/${template.id}/archive`,
      {
        method: 'PATCH',
      }
    );

    // Act
    const response = await PATCH(request as any, { params: { id: template.id } });
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
      }
    );

    // Act
    const response = await PATCH(request as any, { params: { id: nonExistentId } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.message).toContain('не найден');
  });
}); 