import { PATCH } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import { revalidatePath } from 'next/cache';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import mongoose from 'mongoose';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('PATCH /api/admin/tournament-templates/[id]/restore', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  it('должен успешно восстанавливать шаблон и вызывать revalidatePath', async () => {
    // Arrange
    const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
    const template = await TournamentTemplate.create({ 
      name: 'Template to Restore', 
      mapTemplates: [mapTemplate._id],
      archivedAt: new Date(),
    });
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const body = await response.json();
    const updatedTemplate = await TournamentTemplate.findById(template._id).lean();

    // Assert
    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeNull();
    expect(updatedTemplate.archivedAt).toBeNull();
    
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('должен возвращать 404, если шаблон для восстановления не найден', async () => {
    // Arrange
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const request = new Request(`http://localhost/api/admin/tournament-templates/${nonExistentId}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId } });

    // Assert
    expect(response.status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  
  it('должен успешно восстанавливать даже уже активный шаблон (идемпотентность)', async () => {
    // Arrange
    const mapTemplate = await MapTemplate.create({ name: 'Test Map' });
    const template = await TournamentTemplate.create({ 
      name: 'Already Active Template', 
      mapTemplates: [mapTemplate._id],
      archivedAt: null, // Уже активен
    });
    
    const request = new Request(`http://localhost/api/admin/tournament-templates/${template._id}/restore`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: template._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.archivedAt).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});