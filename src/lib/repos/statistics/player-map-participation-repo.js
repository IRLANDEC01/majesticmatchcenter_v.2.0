import PlayerMapParticipation from '@/models/player/PlayerMapParticipation.js';

/**
 * Репозиторий для работы с записями об участии игроков в картах.
 */
class PlayerMapParticipationRepository {
  /**
   * Создает новую запись об участии игрока в карте.
   * @param {object} data - Данные для создания.
   * @returns {Promise<PlayerMapParticipation>}
   */
  async create(data) {
    const participation = new PlayerMapParticipation(data);
    await participation.save();
    return participation.toObject();
  }

  /**
   * Создает несколько записей об участии.
   * @param {Array<object>} data - Массив данных для создания.
   * @returns {Promise<Array<PlayerMapParticipation>>}
   */
  async createMany(data) {
    const participations = await PlayerMapParticipation.insertMany(data);
    return participations.map(p => p.toObject());
  }

  /**
   * Находит все записи по ID карты.
   * @param {string} mapId - ID карты.
   * @returns {Promise<Array<PlayerMapParticipation>>}
   */
  async findByMapId(mapId) {
    return PlayerMapParticipation.find({ mapId }).lean();
  }

  /**
   * Находит и удаляет все записи, связанные с определенной картой.
   * Используется для отката результатов.
   * @param {string} mapId - ID карты.
   * @returns {Promise<object>} - Результат операции удаления от MongoDB.
   */
  async deleteByMapId(mapId) {
    return PlayerMapParticipation.deleteMany({ mapId });
  }
}

export const playerMapParticipationRepo = new PlayerMapParticipationRepository(); 