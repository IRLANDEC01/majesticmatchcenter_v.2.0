import Family from '@/models/family/Family';
import BaseRepo from '@/lib/repos/base-repo';
import { FAMILY_MEMBER_ROLES } from '@/lib/constants.js';

/**
 * @class FamilyRepository
 * @description Репозиторий для работы с данными семей.
 * @extends {BaseRepo}
 */
class FamilyRepository extends BaseRepo {
  constructor() {
    // Передаем модель и префикс для кеша в родительский конструктор
    super(Family, 'family');
  }

  /**
   * Находит семью по имени.
   * @param {string} name - Имя семьи.
   * @returns {Promise<object|null>}
   */
  async findByName(name) {
    // Используем 'i' для регистронезависимого поиска
    return this.model.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).lean();
  }

  /**
   * Находит семью по имени и статусу.
   * @param {string} name - Имя семьи.
   * @param {string} status - Статус ('active', 'archived', 'all').
   * @returns {Promise<object|null>}
   */
  async findByNameAndStatus(name, status) {
    const { data } = await this.find({ q: name, status, limit: 1 });
    if (data && data.length > 0 && data[0].name.toLowerCase() === name.toLowerCase()) {
      return data[0];
    }
    return null;
  }

  /**
   * Атомарно увеличивает рейтинг семьи.
   * @param {string} familyId - ID семьи.
   * @param {number} amount - Величина, на которую нужно увеличить рейтинг.
   * @returns {Promise<void>}
   */
  async incrementRating(familyId, amount) {
    if (amount === 0) return;
    // Используем стандартный метод update из BaseRepo для атомарности и инвалидации кеша
    await this.update(familyId, { $inc: { rating: amount } });
  }

  /**
   * Атомарно изменяет владельца семьи и роли участников.
   * @param {string} familyId
   * @param {string} oldOwnerId
   * @param {string} newOwnerId
   * @returns {Promise<object|null>}
   */
  async changeOwner(familyId, oldOwnerId, newOwnerId) {
    // Этот метод слишком специфичен, чтобы использовать update,
    // так как требует arrayFilters. Оставляем прямую работу с моделью,
    // но инвалидируем кеш вручную.
    const updatedFamily = await this.model.findByIdAndUpdate(
      familyId,
      {
        $set: {
          owner: newOwnerId,
          'members.$[newOwner].role': FAMILY_MEMBER_ROLES.OWNER, // Устанавливаем роль новому
        },
        $unset: {
          'members.$[oldOwner].role': 1, // Удаляем роль у старого владельца
        },
      },
      {
        arrayFilters: [
          { 'oldOwner.player': oldOwnerId },
          { 'newOwner.player': newOwnerId },
        ],
        new: true,
      }
    ).lean();

    if (updatedFamily) {
      await this.cache.delete(this.getCacheKey(familyId));
    }
    return updatedFamily;
  }
}

const familyRepo = new FamilyRepository();
export default familyRepo; 