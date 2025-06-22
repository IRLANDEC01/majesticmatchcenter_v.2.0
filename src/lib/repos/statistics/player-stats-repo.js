import PlayerStats from '@/models/player/PlayerStats.js';
import BaseRepo from '../base-repo.js';

/**
 * @class PlayerStatsRepository
 * @description Репозиторий для работы со статистикой игроков.
 * @extends {BaseRepo}
 */
class PlayerStatsRepository extends BaseRepo {
  constructor() {
    super(PlayerStats, 'playerStats');
  }
  
  /**
   * Находит или создает документ со статистикой игрока.
   * @param {string} playerId - ID игрока.
   * @returns {Promise<Document>} Документ статистики игрока.
   */
  async findOrCreateByPlayerId(playerId) {
    let stats = await this.model.findOne({ playerId });
    if (!stats) {
      stats = await this.create({ playerId });
    }
    return stats;
  }

  /**
   * Применяет набор изменений к общей статистике игрока.
   * Этот метод атомарен для числовых инкрементов.
   * Обработка `weaponStats` требует более сложной логики.
   *
   * @param {string} playerId - ID игрока.
   * @param {object} statsChange - Объект, содержащий статистику для изменения, например { kills: 10, deaths: 5 }.
   * @param {number} [multiplier=1] - 1 для добавления статистики, -1 для вычитания.
   * @returns {Promise<void>}
   */
  async applyOverallStatsChange(playerId, statsChange, multiplier = 1) {
    await this.findOrCreateByPlayerId(playerId);

    const { weaponStats, ...simpleStats } = statsChange;
    const bulkOps = [];

    // 1. Подготовка операции для простых полей (kills, deaths и т.д.)
    const simpleUpdate = { $inc: {} };
    for (const key in simpleStats) {
      if (typeof simpleStats[key] === 'number') {
        simpleUpdate.$inc[`overall.${key}`] = simpleStats[key] * multiplier;
      }
    }

    if (Object.keys(simpleUpdate.$inc).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { playerId },
          update: simpleUpdate,
        },
      });
    }

    // 2. Подготовка операций для сложного массива weaponStats
    if (weaponStats && Array.isArray(weaponStats)) {
      weaponStats.forEach((weapon) => {
        // Операция для обновления существующего оружия
        bulkOps.push({
          updateOne: {
            filter: { playerId, 'overall.weaponStats.weapon': weapon.weapon },
            update: {
              $inc: {
                'overall.weaponStats.$.shotsFired': (weapon.shotsFired || 0) * multiplier,
                'overall.weaponStats.$.hits': (weapon.hits || 0) * multiplier,
                'overall.weaponStats.$.kills': (weapon.kills || 0) * multiplier,
                'overall.weaponStats.$.damage': (weapon.damage || 0) * multiplier,
                'overall.weaponStats.$.headshots': (weapon.headshots || 0) * multiplier,
              },
            },
          },
        });

        // Операция для добавления нового оружия, если оно не найдено
        bulkOps.push({
          updateOne: {
            filter: { playerId, 'overall.weaponStats.weapon': { $ne: weapon.weapon } },
            update: {
              $addToSet: {
                'overall.weaponStats': {
                  weapon: weapon.weapon,
                  shotsFired: weapon.shotsFired || 0,
                  hits: weapon.hits || 0,
                  kills: weapon.kills || 0,
                  damage: weapon.damage || 0,
                  headshots: weapon.headshots || 0,
                  // headshotAccuracy не хранится, т.к. это вычисляемое поле
                },
              },
            },
          },
        });
      });
    }

    if (bulkOps.length > 0) {
      await this.model.bulkWrite(bulkOps);
    }
  }
}

const playerStatsRepo = new PlayerStatsRepository();
export default playerStatsRepo; 