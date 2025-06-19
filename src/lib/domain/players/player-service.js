import { DuplicateError, ValidationError, NotFoundError } from '@/lib/errors.js';
import { playerRepo } from '@/lib/repos/players/player-repo.js';
import { familyRepo } from '@/lib/repos/families/family-repo.js';
import PlayerStats from '@/models/player/PlayerStats.js';
import Family from '@/models/family/Family.js';

/**
 * @class PlayerService
 * @description Сервис для управления бизнес-логикой игроков.
 */
class PlayerService {
  /**
   * Создает нового игрока и связанный с ним документ статистики.
   * @param {object} playerData - Данные игрока.
   * @returns {Promise<object>}
   */
  async createPlayer(playerData) {
    const existingPlayer = await playerRepo.findByName(playerData.firstName, playerData.lastName);
    if (existingPlayer) {
      throw new DuplicateError('Игрок с таким именем и фамилией уже существует.');
    }

    const newPlayer = await playerRepo.create(playerData);
    if (newPlayer) {
      await PlayerStats.create({ playerId: newPlayer._id });
    }
    return newPlayer;
  }

  /**
   * Получает всех игроков.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированных игроков.
   * @returns {Promise<Array<object>>}
   */
  async getAllPlayers(options) {
    return playerRepo.findAll(options);
  }

  /**
   * Получает игрока по ID.
   * @param {string} id - ID игрока.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированных.
   * @returns {Promise<object>}
   * @throws {NotFoundError} Если игрок не найден или архивирован.
   */
  async getPlayerById(id, { includeArchived = false } = {}) {
    // Запрашиваем из репозитория, принудительно включая архивированных,
    // чтобы затем обработать логику здесь, в сервисе.
    const player = await playerRepo.findById(id, { includeArchived: true });

    if (!player) {
      throw new NotFoundError('Игрок не найден.');
    }

    // Если игрок архивирован, а мы не просили включать архивированных,
    // также считаем, что он "не найден" для данного запроса.
    if (player.archivedAt && !includeArchived) {
      throw new NotFoundError('Игрок не найден (архивирован).');
    }

    return player;
  }

  /**
   * Получает игрока по слагу.
   * @param {string} slug - Слаг игрока.
   * @returns {Promise<object|null>}
   */
  async getPlayerBySlug(slug) {
    return playerRepo.findBySlug(slug);
  }

  /**
   * Обновляет данные игрока.
   * @param {string} id - ID игрока.
   * @param {object} playerData - Новые данные.
   * @returns {Promise<object|null>}
   */
  async updatePlayer(id, playerData) {
    const { firstName, lastName } = playerData;

    // Проверяем на дубликат только если передано имя или фамилия
    if (firstName && lastName) {
      const existingPlayer = await playerRepo.findAll({
        filter: {
          _id: { $ne: id },
          firstName,
          lastName,
        },
      });

      if (existingPlayer.length > 0) {
        throw new DuplicateError('Игрок с таким именем и фамилией уже существует.');
      }
    }

    return playerRepo.update(id, playerData);
  }

  /**
   * Архивирует игрока.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async archivePlayer(id) {
    // Проверяем, не является ли игрок владельцем активной семьи.
    const ownedFamily = await Family.findOne({ owner: id, archivedAt: null }).lean();

    if (ownedFamily) {
      throw new ValidationError(
        `Нельзя заархивировать игрока, так как он является владельцем активной семьи "${ownedFamily.name}". Сначала смените владельца.`
      );
    }
    
    // В будущем здесь может быть логика, например, проверка,
    // можно ли архивировать этого игрока (например, если он капитан активной семьи).
    return playerRepo.archive(id);
  }

  /**
   * Восстанавливает игрока из архива.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async unarchivePlayer(id) {
    return playerRepo.unarchive(id);
  }
}

export const playerService = new PlayerService(); 