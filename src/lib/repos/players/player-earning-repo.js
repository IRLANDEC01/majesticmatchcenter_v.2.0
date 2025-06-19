import PlayerEarning from '@/models/player/PlayerEarning';

/**
 * Репозиторий для управления записями о призовых игроков.
 */
class PlayerEarningRepo {
  /**
   * Создает запись о призовых.
   * @param {object} earningData - Данные о призовых.
   * @returns {Promise<Document>}
   */
  create(earningData) {
    return PlayerEarning.create(earningData);
  }
}

export default new PlayerEarningRepo(); 