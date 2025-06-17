import mongoose from 'mongoose';
import Player from './Player.js';

describe('Player Model', () => {
  beforeAll(async () => {
    await Player.init();
  });

  it('должен успешно создавать игрока со всеми валидными полями', async () => {
    const playerData = {
      firstName: 'John',
      lastName: 'Doe',
    };
    const player = new Player(playerData);
    const savedPlayer = await player.save();

    expect(savedPlayer._id).toBeDefined();
    expect(savedPlayer.firstName).toBe('John');
    expect(savedPlayer.lastName).toBe('Doe');
    expect(savedPlayer.status).toBe('active');
  });

  it('должен автоматически генерировать slug из firstName и lastName', async () => {
    const playerData = { firstName: 'Jane', lastName: 'Doe' };
    const player = new Player(playerData);
    await player.save();
    
    expect(player.slug).toBe('jane-doe');
  });

  it('должен автоматически капитализировать firstName и lastName', async () => {
    const playerData = { firstName: 'peter', lastName: 'jones' };
    const player = new Player(playerData);
    await player.save();

    expect(player.firstName).toBe('Peter');
    expect(player.lastName).toBe('Jones');
  });

  it('должен корректно возвращать виртуальное поле fullName', () => {
    const player = new Player({ firstName: 'Alice', lastName: 'Smith' });
    expect(player.fullName).toBe('Alice Smith');
  });

  it('должен выдавать ошибку валидации при отсутствии обязательных полей (например, lastName)', async () => {
    const playerData = { firstName: 'JustFirstName' };
    const player = new Player(playerData);
    
    let err;
    try {
      await player.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.lastName).toBeDefined();
    expect(err.errors.firstName).not.toBeDefined();
  });

  it('должен выдавать ошибку при попытке создать дубликат по firstName и lastName', async () => {
    const playerData = { firstName: 'Duplicate', lastName: 'Player' };
    await new Player(playerData).save();

    const secondPlayer = new Player(playerData);
    
    await expect(secondPlayer.save()).rejects.toThrow();
  });

  it('должен выдавать ошибку валидации при отсутствии firstName', async () => {
    const playerData = { lastName: 'JustLastName' };
    const player = new Player(playerData);
    
    let err;
    try {
      await player.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.firstName).toBeDefined();
  });
}); 