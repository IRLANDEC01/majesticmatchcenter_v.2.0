import FamilyRatingHistory from '@/models/family/FamilyRatingHistory';

class FamilyRatingHistoryRepository {
  /**
   * Создает новую запись в истории рейтинга семьи.
   * @param {object} data - Данные для новой записи.
   * @returns {Promise<Document>} Созданный документ.
   */
  async create(data) {
    return FamilyRatingHistory.create(data);
  }

  /**
   * Находит и удаляет все записи истории рейтинга для указанной карты.
   * @param {string} mapId - ID карты.
   * @returns {Promise<Array<Document>>} Промис, который разрешается в массив удаленных документов.
   */
  async findAndDeleteByMapId(mapId) {
    const records = await FamilyRatingHistory.find({ map: mapId }).lean();
    if (records.length > 0) {
      await FamilyRatingHistory.deleteMany({ map: mapId });
    }
    return records;
  }
}

export const familyRatingHistoryRepository = new FamilyRatingHistoryRepository(); 