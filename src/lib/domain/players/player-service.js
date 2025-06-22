import { DuplicateError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors.js';
import playerRepo from '@/lib/repos/players/player-repo.js';
import playerStatsRepo from '@/lib/repos/statistics/player-stats-repo.js';
import familyRepo from '@/lib/repos/families/family-repo.js';
import Family from '@/models/family/Family.js';

/**
 * @class PlayerService
 * @description Сервис для управления бизнес-логикой игроков.
 */
class PlayerService {
  /**
   * @constructor
   * @param {object} repos - Репозитории.
   * @param {object} repos.playerRepo - Репозиторий игроков.
   * @param {object} repos.playerStatsRepo - Репозиторий статистики игроков.
   * @param {object} repos.familyRepo - Репозиторий семей.
   */
  constructor({ playerRepo, playerStatsRepo, familyRepo }) {
    this.playerRepo = playerRepo;
    this.playerStatsRepo = playerStatsRepo;
    this.familyRepo = familyRepo;
  }

  /**
   * Создает нового игрока и связанный с ним документ статистики.
   * @param {object} playerData - Данные игрока.
   * @returns {Promise<object>}
   */
  async createPlayer(playerData) {
    const existingPlayer = await this.playerRepo.findByNameWithFamily(
      playerData.firstName,
      playerData.lastName
    );
    if (existingPlayer) {
      throw new DuplicateError('Игрок с таким именем и фамилией уже существует.');
    }

    const newPlayer = await this.playerRepo.create(playerData);
    if (newPlayer) {
      await this.playerStatsRepo.create({ playerId: newPlayer._id });
    }
    return newPlayer;
  }

  /**
   * Получает игроков с фильтрацией и пагинацией.
   * Делегирует вызов напрямую в репозиторий, который унаследовал
   * продвинутый метод `find` от `BaseRepo`.
   * @param {object} [options] - Опции для `BaseRepo.find`.
   * @returns {Promise<object>} - { data, total, page, limit }
   */
  async getPlayers(options) {
    // ПРАВИЛЬНЫЙ ВЫЗОВ: playerRepo.find, унаследованный от BaseRepo
    return this.playerRepo.find(options);
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
    const player = await this.playerRepo.findById(id, { includeArchived: true });

    if (!player) {
      throw new NotFoundError('Игрок не найден.');
    }

    if (player.archivedAt && !includeArchived) {
      throw new NotFoundError('Игрока не существует или он в архиве.');
    }

    return player;
  }

  /**
   * Обновляет данные игрока.
   * @param {string} id - ID игрока.
   * @param {object} playerData - Новые данные.
   * @returns {Promise<object|null>}
   */
  async updatePlayer(id, playerData) {
    const { firstName, lastName } = playerData;

    if (firstName && lastName) {
      const existingPlayer = await this.playerRepo.findByNameWithFamily(firstName, lastName);
      if (existingPlayer && existingPlayer._id.toString() !== id) {
        throw new DuplicateError('Игрок с таким именем и фамилией уже существует.');
      }
    }

    return this.playerRepo.update(id, playerData);
  }

  /**
   * Архивирует игрока.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async archivePlayer(id) {
    const playerToArchive = await this.getPlayerById(id, { includeArchived: true });

    if (playerToArchive.archivedAt) {
      throw new ConflictError('Игрок уже находится в архиве.');
    }
    
    const ownedFamily = await Family.findOne({ owner: id, archivedAt: null }).lean();
    if (ownedFamily) {
      throw new ValidationError(
        `Нельзя заархивировать игрока, так как он является владельцем активной семьи "${ownedFamily.name}". Сначала смените владельца.`
      );
    }

    return this.playerRepo.archive(id);
  }

  /**
   * Восстанавливает игрока из архива.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   * @throws {NotFoundError} Если игрок не найден.
   */
  async unarchivePlayer(id) {
    const playerToRestore = await this.playerRepo.findById(id, { includeArchived: true });

    if (!playerToRestore) {
      throw new NotFoundError('Игрок для восстановления не найден.');
    }

    if (!playerToRestore.archivedAt) {
      return playerToRestore;
    }

    return this.playerRepo.restore(id);
  }
}

const playerService = new PlayerService({
  playerRepo,
  playerStatsRepo,
  familyRepo,
});

export default playerService;