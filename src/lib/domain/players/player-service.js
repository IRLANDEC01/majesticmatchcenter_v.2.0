import { playerRepository } from '@/lib/repos/players/player-repo.js';

/**
 * @class PlayerService
 * @description Сервис для управления бизнес-логикой игроков.
 */
class PlayerService {
  /**
   * Создает нового игрока.
   * @param {object} playerData - Данные игрока.
   * @returns {Promise<object>}
   */
  async createPlayer(playerData) {
    // В будущем здесь может быть логика проверки,
    // например, не существует ли уже игрок с похожим ником.
    return playerRepository.create(playerData);
  }

  /**
   * Получает всех игроков.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированных игроков.
   * @returns {Promise<Array<object>>}
   */
  async getAllPlayers(options) {
    return playerRepository.findAll(options);
  }

  /**
   * Получает игрока по ID.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async getPlayerById(id) {
    return playerRepository.findById(id);
  }

  /**
   * Получает игрока по слагу.
   * @param {string} slug - Слаг игрока.
   * @returns {Promise<object|null>}
   */
  async getPlayerBySlug(slug) {
    return playerRepository.findBySlug(slug);
  }

  /**
   * Обновляет данные игрока.
   * @param {string} id - ID игрока.
   * @param {object} playerData - Новые данные.
   * @returns {Promise<object|null>}
   */
  async updatePlayer(id, playerData) {
    // Здесь может быть логика, запрещающая изменять определенные поля,
    // например, имя или фамилию после создания.
    return playerRepository.update(id, playerData);
  }

  /**
   * Архивирует игрока.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async archivePlayer(id) {
    // В будущем здесь может быть логика, например, проверка,
    // можно ли архивировать этого игрока (например, если он капитан активной семьи).
    return playerRepository.archive(id);
  }

  /**
   * Восстанавливает игрока из архива.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async unarchivePlayer(id) {
    return playerRepository.unarchive(id);
  }
}

export const playerService = new PlayerService(); 