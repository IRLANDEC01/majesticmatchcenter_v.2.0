import PlayerStats from '@/models/player/PlayerStats';

class PlayerStatsRepository {
  /**
   * Находит или создает документ со статистикой игрока.
   * @param {string} playerId - ID игрока.
   * @returns {Promise<Document>} Документ статистики игрока.
   */
  async findOrCreateByPlayerId(playerId) {
    let stats = await PlayerStats.findOne({ playerId });
    if (!stats) {
      stats = await PlayerStats.create({ playerId });
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

    const updateQuery = { $inc: {} };

    for (const key in statsChange) {
      if (key !== 'weaponStats' && typeof statsChange[key] === 'number') {
        updateQuery.$inc[`overall.${key}`] = statsChange[key] * multiplier;
      }
    }
    
    // Логика обновления weaponStats сложна и будет обработана отдельно.
    // Пока мы обновляем только простые числовые поля.

    if (Object.keys(updateQuery.$inc).length > 0) {
      await PlayerStats.updateOne({ playerId }, updateQuery);
    }

    // TODO: Реализовать атомарное обновление для массива weaponStats.
  }
}

export const playerStatsRepository = new PlayerStatsRepository(); 