import PlayerMapParticipation from '@/models/player/PlayerMapParticipation';

class PlayerMapParticipationRepository {
  /**
   * Создает новую запись об участии игрока в карте.
   * @param {object} data - Данные для новой записи.
   * @returns {Promise<Document>} Созданный документ.
   */
  async create(data) {
    return PlayerMapParticipation.create(data);
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

export const playerMapParticipationRepository = new PlayerMapParticipationRepository(); 