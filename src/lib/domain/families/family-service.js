import { familyRepo } from '@/lib/repos/families/family-repo.js';
import FamilyStats from '@/models/family/FamilyStats.js';
import { DuplicateError, NotFoundError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Схема Zod для валидации данных при создании и обновлении семьи.
const familySchema = z.object({
  name: z.string().trim().min(1, 'Название семьи обязательно.'),
  displayLastName: z.string().trim().min(1, 'Отображаемая фамилия обязательна.'),
  description: z.string().trim().max(5000).optional(),
  logo: z.string().url('Некорректный URL логотипа.').optional().nullable(),
  banner: z.string().url('Некорректный URL баннера.').optional().nullable(),
});

/**
 * @class FamilyService
 * @description Сервис для управления бизнес-логикой семей.
 */
export class FamilyService {
  /**
   * Проверяет, уникально ли имя семьи.
   * @private
   */
  async _validateNameUniqueness(name, currentFamilyId = null) {
    const existingFamily = await familyRepo.findByName(name);
    if (existingFamily && (!currentFamilyId || existingFamily._id.toString() !== currentFamilyId)) {
      throw new DuplicateError('Семья с таким названием уже существует.');
    }
  }

  /**
   * Создает новую семью и связанную с ней статистику.
   * @param {object} familyData - Данные для создания.
   * @returns {Promise<object>}
   */
  async createFamily(familyData) {
    const validationResult = familySchema.safeParse(familyData);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.flatten().fieldErrors);
    }
    const validatedData = validationResult.data;

    await this._validateNameUniqueness(validatedData.name);
    
    const newFamily = await familyRepo.create(validatedData);
    if (newFamily) {
      // После успешного создания семьи, создаем для нее документ статистики
      await FamilyStats.create({ familyId: newFamily._id });
    }
    return newFamily;
  }

  /**
   * Получает все семьи.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированные семьи.
   * @returns {Promise<Array<object>>}
   */
  async getAllFamilies(options) {
    return familyRepo.findAll(options);
  }

  /**
   * Получает семью по ID.
   * @param {string} id - ID семьи.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированные.
   * @returns {Promise<object>}
   * @throws {NotFoundError} Если семья не найдена или архивирована (и не запрошена).
   */
  async getFamilyById(id, { includeArchived = false } = {}) {
    const family = await familyRepo.findById(id);

    if (!family || (!includeArchived && family.archivedAt)) {
      throw new NotFoundError('Семья не найдена.');
    }

    return family;
  }

  /**
   * Обновляет данные семьи.
   * @param {string} id - ID семьи.
   * @param {object} familyData - Новые данные.
   * @returns {Promise<object>}
   * @throws {NotFoundError} Если семья не найдена.
   * @throws {ValidationError} Если данные невалидны.
   * @throws {DuplicateError} Если имя семьи уже занято.
   */
  async updateFamily(id, familyData) {
    const validationResult = familySchema.partial().safeParse(familyData);
    if (!validationResult.success) {
      throw new ValidationError('Ошибка валидации', validationResult.error.flatten().fieldErrors);
    }
    const validatedData = validationResult.data;

    if (validatedData.name) {
      await this._validateNameUniqueness(validatedData.name, id);
    }

    const updatedFamily = await familyRepo.update(id, validatedData);

    if (!updatedFamily) {
      throw new NotFoundError('Семья для обновления не найдена.');
    }

    return updatedFamily;
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
    return familyRepo.update(familyId, { $push: { members: memberData } });
  }

  /**
   * Удаляет участника из семьи.
   * @param {string} familyId - ID семьи.
   * @param {string} playerId - ID игрока.
   * @returns {Promise<object|null>}
   */
  async removeMember(familyId, playerId) {
    // Используем оператор $pull для удаления из массива по ID игрока
    return familyRepo.update(familyId, { $pull: { members: { player: playerId } } });
  }

  /**
   * Архивирует семью (мягкое удаление).
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async archiveFamily(id) {
    // Здесь может быть логика проверки, можно ли архивировать семью
    // (например, если она участвует в активном турнире).
    return familyRepo.archive(id);
  }

  /**
   * Восстанавливает семью из архива.
   * @param {string} id - ID семьи.
   * @returns {Promise<object|null>}
   */
  async unarchiveFamily(id) {
    return familyRepo.unarchive(id);
  }
}

export const familyService = new FamilyService(); 