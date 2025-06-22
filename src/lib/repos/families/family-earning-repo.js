import FamilyEarning from '@/models/family/FamilyEarning';

/**
 * Репозиторий для управления записями о призовых семей.
 */
class FamilyEarningRepo {
  /**
   * Создает запись о призовых.
   * @param {object} earningData - Данные о призовых.
   * @returns {Promise<Document>}
   */
  create(earningData) {
    return FamilyEarning.create(earningData);
  }
}

export default FamilyEarningRepo; 