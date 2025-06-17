import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import { playerStatsRepository } from './player-stats-repo';
import PlayerStats from '@/models/player/PlayerStats';

describe('PlayerStatsRepository', () => {
  let playerId;

  beforeAll(async () => {
    await connectToDatabase();
    playerId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await PlayerStats.deleteMany({});
  });

  const firstMapStats = {
    kills: 10,
    deaths: 5,
    damageDealt: 1200,
    weaponStats: [
      { weapon: 'AK-47', kills: 8, damage: 900, shotsFired: 50, hits: 25, headshots: 4 },
      { weapon: 'Glock-18', kills: 2, damage: 300, shotsFired: 20, hits: 10, headshots: 1 },
    ],
  };

  const secondMapStats = {
    kills: 5,
    deaths: 2,
    damageDealt: 600,
    weaponStats: [
      { weapon: 'AK-47', kills: 3, damage: 400, shotsFired: 30, hits: 15, headshots: 2 },
      { weapon: 'AWP', kills: 2, damage: 200, shotsFired: 5, hits: 2, headshots: 2 },
    ],
  };

  it('должен правильно применять статистику в первый раз', async () => {
    await playerStatsRepository.applyOverallStatsChange(playerId, firstMapStats);

    const stats = await PlayerStats.findOne({ playerId });
    expect(stats).not.toBeNull();
    expect(stats.overall.kills).toBe(10);
    expect(stats.overall.deaths).toBe(5);
    expect(stats.overall.weaponStats.length).toBe(2);
    const ak47Stats = stats.overall.weaponStats.find((w) => w.weapon === 'AK-47');
    expect(ak47Stats.kills).toBe(8);
  });

  it('должен инкрементально обновлять статистику и добавлять новое оружие', async () => {
    // Применяем первую статистику
    await playerStatsRepository.applyOverallStatsChange(playerId, firstMapStats);
    // Применяем вторую статистику
    await playerStatsRepository.applyOverallStatsChange(playerId, secondMapStats);

    const stats = await PlayerStats.findOne({ playerId });
    expect(stats.overall.kills).toBe(15); // 10 + 5
    expect(stats.overall.deaths).toBe(7); // 5 + 2
    expect(stats.overall.weaponStats.length).toBe(3); // AK-47, Glock-18, AWP

    const ak47Stats = stats.overall.weaponStats.find((w) => w.weapon === 'AK-47');
    expect(ak47Stats.kills).toBe(11); // 8 + 3

    const awpStats = stats.overall.weaponStats.find((w) => w.weapon === 'AWP');
    expect(awpStats.kills).toBe(2);
  });

  it('должен правильно откатывать статистику, обнуляя, но не удаляя оружие', async () => {
    // Применяем статистику
    await playerStatsRepository.applyOverallStatsChange(playerId, firstMapStats);
    
    // Откатываем ту же статистику
    await playerStatsRepository.applyOverallStatsChange(playerId, firstMapStats, -1);

    const stats = await PlayerStats.findOne({ playerId });
    expect(stats.overall.kills).toBe(0);
    expect(stats.overall.deaths).toBe(0);
    expect(stats.overall.weaponStats.length).toBe(2); // Оружие остается в массиве

    const ak47Stats = stats.overall.weaponStats.find((w) => w.weapon === 'AK-47');
    expect(ak47Stats.kills).toBe(0);
    expect(ak47Stats.damage).toBe(0);

    const glockStats = stats.overall.weaponStats.find((w) => w.weapon === 'Glock-18');
    expect(glockStats.kills).toBe(0);
  });
}); 