import { familyRepo } from '@/lib/repos/families/family-repo.js';
import { playerRepo } from '@/lib/repos/players/player-repo.js';
import FamilyStats from '@/models/family/FamilyStats.js';
import { DuplicateError, NotFoundError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { FAMILY_MEMBER_ROLES } from '@/lib/constants';

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
    // Валидация была перенесена в route.js
    const { ownerId, name, displayLastName, description, logo, banner } = familyData;

    // 1. Проверяем, что игрок-владелец существует и не архивирован.
    const owner = await playerRepo.findById(ownerId);
    if (!owner) {
      throw new NotFoundError('Указанный игрок-владелец не найден или архивирован.');
    }

    // 1a. Проверяем, что игрок не состоит в другой семье.
    if (owner.currentFamily) {
      throw new ValidationError('Игрок уже состоит в другой семье и не может быть назначен владельцем.');
    }

    // 2. Проверяем уникальность названия семьи
    await this._validateNameUniqueness(name);

    // 3. Формируем данные для создания
    const familyToCreate = {
      name,
      displayLastName,
      description,
      logo,
      banner,
      owner: ownerId, // Устанавливаем ID владельца
      members: [
        {
          // Автоматически добавляем владельца в участники
          player: ownerId,
          role: FAMILY_MEMBER_ROLES.OWNER, // Назначаем роль владельца
          joinedAt: new Date(),
        },
      ],
    };

    const newFamily = await familyRepo.create(familyToCreate);
    if (newFamily) {
      // После успешного создания семьи, создаем для нее документ статистики
      await FamilyStats.create({ familyId: newFamily._id });
      // И обновляем поле currentFamily у игрока-владельца
      await playerRepo.update(ownerId, { currentFamily: newFamily._id });
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
    // Используем Zod для валидации, но определяем схему локально для этого метода,
    // так как она отличается от схемы создания (все поля опциональны).
    const updateSchema = z.object({
        name: z.string().trim().min(1).optional(),
        displayLastName: z.string().trim().min(1).optional(),
        description: z.string().trim().max(5000).optional(),
        logo: z.string().url().optional().nullable(),
        banner: z.string().url().optional().nullable(),
    }).partial();

    const validationResult = updateSchema.safeParse(familyData);
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

  /**
   * Изменяет владельца семьи.
   * @param {string} familyId - ID семьи.
   * @param {string} newOwnerId - ID нового владельца.
   * @returns {Promise<object>}
   */
  async changeOwner(familyId, newOwnerId) {
    // 1. Проверяем, что семья и новый владелец существуют
    const family = await this.getFamilyById(familyId);
    const newOwner = await playerRepo.findById(newOwnerId);

    if (!newOwner) {
      throw new NotFoundError('Новый владелец не найден.');
    }

    // 2. Проверяем, что новый владелец является членом этой семьи
    const isMember = family.members.some(member => member.player.toString() === newOwnerId);
    if (!isMember) {
      throw new ValidationError('Новый владелец должен быть участником семьи.');
    }
    
    // 3. Нельзя назначить владельцем текущего владельца
    if (family.owner.toString() === newOwnerId) {
      throw new ValidationError('Этот игрок уже является владельцем семьи.');
    }

    const oldOwnerId = family.owner.toString();

    // 4. Атомарно обновляем семью
    const updatedFamily = await familyRepo.changeOwner(familyId, oldOwnerId, newOwnerId);

    return updatedFamily;
  }
}

export const familyService = new FamilyService(); 