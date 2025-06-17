import { familyRepository } from '@/lib/repos/families/family-repo';

/**
 * @class FamilyService
 * @description Сервис для управления бизнес-логикой семей.
 */
export class FamilyService {
  /**
   * @param {object} familyRepository - Репозиторий для работы с данными семей.
   */
  constructor(familyRepository) {
    this.familyRepository = familyRepository;
  }

  /**
   * Создает новую семью.
   * @param {object} familyData - Данные для создания.
   * @returns {Promise<object>}
   */
  async createFamily(familyData) {
    // В будущем здесь может быть логика, например,
    // отправка уведомления о создании новой семьи.
    return this.familyRepository.create(familyData);
  }

  /**
   * Получает все семьи.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeInactive=false] - Включить неактивные семьи.
   * @returns {Promise<Array<object>>}
   */
  async getAllFamilies(options) {
    return this.familyRepository.findAll(options);
  }

  /**
   * Получает семью по ID.
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async getFamilyById(id) {
    return this.familyRepository.findById(id);
  }

  /**
   * Обновляет данные семьи.
   * @param {string} id - ID семьи.
   * @param {object} familyData - Новые данные.
   * @returns {Promise<object|null>}
   */
  async updateFamily(id, familyData) {
    // Здесь также может появиться дополнительная логика,
    // например, проверка прав на редактирование.
    return this.familyRepository.update(id, familyData);
  }

  /**
   * Добавляет участника в семью.
   * @param {string} familyId - ID семьи.
   * @param {string} playerId - ID игрока.
   * @param {string} [role] - Роль игрока в семье.
   * @returns {Promise<object|null>}
   */
  async addMember(familyId, playerId, role) {
    const memberData = { player: playerId, role };
    // Используем оператор $push для добавления в массив
    return this.familyRepository.update(familyId, { $push: { members: memberData } });
  }

  /**
   * Удаляет участника из семьи.
   * @param {string} familyId - ID семьи.
   * @param {string} playerId - ID игрока.
   * @returns {Promise<object|null>}
   */
  async removeMember(familyId, playerId) {
    // Используем оператор $pull для удаления из массива по ID игрока
    return this.familyRepository.update(familyId, { $pull: { members: { player: playerId } } });
  }

  /**
   * Деактивирует семью (мягкое удаление).
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async deactivateFamily(id) {
    // Здесь может быть логика проверки, можно ли деактивировать семью.
    return this.familyRepository.deactivate(id);
  }
}

export const familyService = new FamilyService(familyRepository); 