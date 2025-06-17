import mongoose from 'mongoose';
import Family from './Family.js';
import Player from '../player/Player.js';

describe('Family Model', () => {
  beforeAll(async () => {
    await Family.init();
  });

  it('должен успешно создавать семью со всеми валидными полями', async () => {
    const testPlayer = await new Player({
      firstName: 'Test',
      lastName: 'PlayerForFamily'
    }).save();
    
    const familyData = {
      name: 'The Winners',
      displayLastName: 'Winners',
      members: [{ player: testPlayer._id, role: 'leader' }],
    };
    const family = new Family(familyData);
    const savedFamily = await family.save();

    expect(savedFamily._id).toBeDefined();
    expect(savedFamily.name).toBe('The Winners');
    expect(savedFamily.slug).toBe('the-winners');
    expect(savedFamily.members[0].role).toBe('leader');
  });

  it('должен автоматически генерировать slug из name', async () => {
    const family = new Family({ name: 'Alpha Team', displayLastName: 'Alpha' });
    await family.save();
    expect(family.slug).toBe('alpha-team');
  });
  
  it('должен выдавать ошибку валидации при отсутствии обязательных полей', async () => {
    const family = new Family({ name: 'Missing DisplayName' });
    let err;
    try {
      await family.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.displayLastName).toBeDefined();
  });

  it('должен выдавать ошибку при попытке создать дубликат по имени', async () => {
    const familyData = { name: 'Unique Family', displayLastName: 'Unique' };
    await new Family(familyData).save();
    
    const duplicateFamily = new Family(familyData);
    await expect(duplicateFamily.save()).rejects.toThrow();
  });
  
  it('должен выдавать ошибку валидации для некорректного имени с цифрами', async () => {
    const family = new Family({ name: 'Family 123', displayLastName: 'Invalid' });
    let err;
    try {
      await family.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
  });

  it('должен выдавать ошибку валидации для некорректной роли участника', async () => {
    const testPlayer = await new Player({
      firstName: 'Test',
      lastName: 'PlayerForFamily'
    }).save();

    const familyData = {
      name: 'Role Test Family',
      displayLastName: 'RoleTest',
      members: [{ player: testPlayer._id, role: 'invalid-role' }],
    };
    const family = new Family(familyData);
    let err;
    try {
      await family.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors['members.0.role']).toBeDefined();
  });
}); 