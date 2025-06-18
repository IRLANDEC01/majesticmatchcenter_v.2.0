import PlayerMapParticipation from '@/models/player/PlayerMapParticipation';

class PlayerMapParticipationRepository {
  /**
   * Создает или обновляет запись об участии игрока в карте.
   * Если запись существует, она будет обновлена.
   * @param {object} query - Условие для поиска (например, { playerId, mapId }).
   * @param {object} data - Данные для создания или обновления.
   * @returns {Promise<Document>} Созданный или обновленный документ.
   */
  async upsert(query, data) {
    return PlayerMapParticipation.findOneAndUpdate(query, data, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  /**
   * Находит и удаляет все записи об участии для указанной карты.
   * @param {string} mapId - ID карты.
   * @returns {Promise<Array<Document>>} Промис, который разрешается в массив удаленных документов.
   */
  async findAndDeleteByMapId(mapId) {
    const records = await PlayerMapParticipation.find({ mapId }).lean();
    if (records.length > 0) {
      await PlayerMapParticipation.deleteMany({ mapId });
    }
    return records;
  }
}

export const playerMapParticipationRepo = new PlayerMapParticipationRepository(); 