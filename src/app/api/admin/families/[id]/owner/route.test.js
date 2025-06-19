import { PATCH } from './route.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';
import models from '@/models/index.js';

const { Family, Player } = models;

describe('API /api/admin/families/[id]/owner', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);

  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  it('должен успешно сменить владельца семьи', async () => {
    // Arrange
    const family = testData.families[0];
    const oldOwner = testData.players[0];
    const newOwner = await Player.create({ firstName: 'New', lastName: 'Owner' });
    // Добавляем нового игрока в семью
    family.members.push({ player: newOwner._id });
    await family.save();

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

    const updatedFamily = await Family.findById(family._id);
    const oldOwnerMember = updatedFamily.members.find(m => m.player.toString() === oldOwner._id.toString());
    const newOwnerMember = updatedFamily.members.find(m => m.player.toString() === newOwner._id.toString());
    
    expect(oldOwnerMember.role).toBeUndefined();
    expect(newOwnerMember.role).toBe('owner');
  });

  it('должен возвращать ошибку 400, если новый владелец не является членом семьи', async () => {
    // Arrange
    const family = testData.families[0];
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
  
  it('должен возвращать ошибку 400, если игрок уже является владельцем', async () => {
    // Arrange
    const family = testData.families[0];
    const currentOwner = testData.players[0];

    const request = new Request(`http://localhost/api/admin/families/${family._id}/owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: currentOwner._id.toString() }),
    });

    // Act
    const response = await PATCH(request, { params: { id: family._id.toString() } });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.message).toContain('Этот игрок уже является владельцем семьи');
  });
}); 