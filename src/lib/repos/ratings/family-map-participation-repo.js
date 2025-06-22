import FamilyMapParticipation from '@/models/family/FamilyMapParticipation.js';

/**
 * Репозиторий для работы с записями об участии семей в картах.
 */
class FamilyMapParticipationRepo {
  /**
   * Создает новую запись об участии семьи в карте.
   * @param {object} data - Данные для создания.
   * @returns {Promise<FamilyMapParticipation>}
   */
  async create(data) {
    const participation = new FamilyMapParticipation(data);
    await participation.save();
    return participation.toObject();
  }

  /**
   * Находит все записи об участии для конкретной карты.
   * @param {string} mapId - ID карты.
   * @returns {Promise<FamilyMapParticipation[]>}
   */
  async findByMapId(mapId) {
    return FamilyMapParticipation.find({ mapId }).lean();
  }

  /**
   * Находит и удаляет все записи, связанные с определенной картой.
   * Используется для отката результатов.
   * @param {string} mapId - ID карты.
   * @returns {Promise<object>} - Результат операции удаления от MongoDB.
   */
  async deleteByMapId(mapId) {
    return FamilyMapParticipation.deleteMany({ mapId });
  }
}

export default FamilyMapParticipationRepo; 