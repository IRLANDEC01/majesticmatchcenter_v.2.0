import { PATCH } from './route';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import Family from '@/models/family/Family';
import Player from '@/models/player/Player';
import { revalidatePath } from 'next/cache';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('PATCH /api/admin/families/[id]/archive', () => {
  let owner;

  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
    owner = await Player.create({ firstName: 'Test', lastName: 'Owner' });
  });

  it('должен успешно архивировать семью и вызывать revalidatePath', async () => {
    // Arrange
    const family = await Family.create({ name: 'Family to Archive', displayLastName: 'ArchiveMe', owner: owner._id });
    const request = new Request(`http://localhost/api/admin/families/${family._id}/archive`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: family._id.toString() } });
    const body = await response.json();
    const updatedFamily = await Family.findById(family._id);

    // Assert
    expect(response.status).toBe(200);
    expect(body.archivedAt).not.toBeNull();
    expect(updatedFamily.archivedAt).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/families');
  });

  it('должен возвращать 404, если семья не найдена', async () => {
    // Arrange
    const nonExistentId = '66a55543665792f285915c32';
    const request = new Request(`http://localhost/api/admin/families/${nonExistentId}/archive`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: nonExistentId } });

    // Assert
    expect(response.status).toBe(404);
  });

  it('должен возвращать 409 при попытке заархивировать уже архивированную семью', async () => {
    // Arrange
    const family = await Family.create({ name: 'Archived Family', displayLastName: 'Archived', owner: owner._id, archivedAt: new Date() });
    
    const request = new Request(`http://localhost/api/admin/families/${family._id}/archive`, {
      method: 'PATCH',
    });

    // Act
    const response = await PATCH(request, { params: { id: family._id.toString() } });

    // Assert
    expect(response.status).toBe(409);
  });
});