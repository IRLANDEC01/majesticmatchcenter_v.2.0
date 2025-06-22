import PlayerRatingHistory from '@/models/player/PlayerRatingHistory';

class PlayerRatingHistoryRepository {
  /**
   * Создает новую запись в истории рейтинга игрока.
   * @param {object} data - Данные для новой записи.
   * @returns {Promise<Document>} Созданный документ.
   */
  async create(data) {
    return PlayerRatingHistory.create(data);
  }

  /**
   * Находит и удаляет все записи истории рейтинга для указанной карты.
   * @param {string} mapId - ID карты.
   * @returns {Promise<Array<Document>>} Промис, который разрешается в массив удаленных документов.
   */
  async findAndDeleteByMapId(mapId) {
    const records = await PlayerRatingHistory.find({ map: mapId }).lean();
    if (records.length > 0) {
      await PlayerRatingHistory.deleteMany({ map: mapId });
    }
    return records;
  }
}

export default PlayerRatingHistoryRepository; 