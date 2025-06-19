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
    const { testData: data } = await populateDb({ numPlayers: 2, numFamilies: 2 });
    testData = data;
  });

  it('должен успешно сменить владельца семьи', async () => {
    // Arrange
    const family = testData.familyGucci;
    const oldOwner = testData.playerGucci;
    const newOwner = testData.playerUzi;
    
    // Добавляем нового игрока в семью
    await Family.findByIdAndUpdate(family._id, {
      $push: { members: { player: newOwner._id } },
    });

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

  it('должен возвращать ошибку 400, если новый владелец не является членом семьи', async () => {
    // Arrange
    const family = testData.familyGucci;
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
    const family = testData.familyGucci;
    const currentOwner = testData.playerGucci;

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