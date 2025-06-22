import { PATCH } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import Family from '@/models/family/Family.js';
import Player from '@/models/player/Player.js';
import { revalidatePath } from 'next/cache';
import { FAMILY_MEMBER_ROLES } from '@/lib/constants.js';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/families/[id]/owner', () => {
  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
  });

  it('должен успешно сменить владельца семьи', async () => {
    // Arrange
    const oldOwner = await Player.create({ firstName: 'Old', lastName: 'Owner' });
    const newOwner = await Player.create({ firstName: 'New', lastName: 'Owner' });
    
    const family = await Family.create({
      name: 'Test Family',
      displayLastName: 'Test',
      owner: oldOwner._id,
      members: [
        { player: oldOwner._id, role: FAMILY_MEMBER_ROLES.OWNER, joinedAt: new Date() },
        { player: newOwner._id, joinedAt: new Date() },
      ],
    });
    
    await Player.findByIdAndUpdate(oldOwner._id, { familyId: family._id });
    await Player.findByIdAndUpdate(newOwner._id, { familyId: family._id });

    const request = new Request(`http://localhost/api/admin/families/${family._id}/owner`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newOwnerId: newOwner._id.toString() }),
    });

    // Act
    const response = await PATCH(request, { params: { id: family._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.owner.toString()).toBe(newOwner._id.toString());

    const updatedFamily = await Family.findById(family._id).lean();
    const oldOwnerMember = updatedFamily.members.find(m => m.player.toString() === oldOwner._id.toString());
    const newOwnerMember = updatedFamily.members.find(m => m.player.toString() === newOwner._id.toString());
    
    expect(oldOwnerMember.role).toBeUndefined();
    expect(newOwnerMember.role).toBe('owner');
  });

  it('должен возвращать 400, если новый владелец не является членом семьи', async () => {
    // Arrange
    const owner = await Player.create({ firstName: 'Owner', lastName: 'Owner' });
    const family = await Family.create({ name: 'Test Family', displayLastName: 'Test', owner: owner._id, members: [{ player: owner._id }] });
    const nonMember = await Player.create({ firstName: 'Non', lastName: 'Member' });

    const request = new Request(`http://localhost/api/admin/families/${family._id}/owner`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newOwnerId: nonMember._id.toString() }),
    });

    // Act
    const response = await PATCH(request, { params: { id: family._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.message).toContain('Новый владелец должен быть участником семьи');
  });
  
  it('должен возвращать 409, если игрок уже является владельцем', async () => {
    // Arrange
    const currentOwner = await Player.create({ firstName: 'Current', lastName: 'Owner' });
    const family = await Family.create({ name: 'Test Family', displayLastName: 'Test', owner: currentOwner._id, members: [{ player: currentOwner._id }] });

    const request = new Request(`http://localhost/api/admin/families/${family._id}/owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: currentOwner._id.toString() }),
    });

    // Act
    const response = await PATCH(request, { params: { id: family._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(409);
    expect(body.message).toContain('Этот игрок уже является владельцем семьи');
  });
});