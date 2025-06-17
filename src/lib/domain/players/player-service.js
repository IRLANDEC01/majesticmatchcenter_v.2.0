import { playerRepository } from '@/lib/repos/players/player-repo';

/**
 * @class PlayerService
 * @description Сервис для управления бизнес-логикой игроков.
 */
export class PlayerService {
  /**
   * @param {object} playerRepository - Репозиторий для работы с данными игроков.
   */
  constructor(playerRepository) {
    this.playerRepository = playerRepository;
  }

  /**
   * Создает нового игрока.
   * @param {object} playerData - Данные игрока.
   * @returns {Promise<object>}
   */
  async createPlayer(playerData) {
    // В будущем здесь может быть логика проверки,
    // например, не существует ли уже игрок с похожим ником.
    return this.playerRepository.create(playerData);
  }

  /**
   * Получает всех игроков.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeInactive=false] - Включить неактивных игроков.
   * @returns {Promise<Array<object>>}
   */
  async getAllPlayers(options) {
    return this.playerRepository.findAll(options);
  }

  /**
   * Получает игрока по ID.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async getPlayerById(id) {
    return this.playerRepository.findById(id);
  }

  /**
   * Получает игрока по слагу.
   * @param {string} slug - Слаг игрока.
   * @returns {Promise<object|null>}
   */
  async getPlayerBySlug(slug) {
    return this.playerRepository.findBySlug(slug);
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
    return this.playerRepository.update(id, playerData);
  }

  /**
   * Деактивирует игрока.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async deactivatePlayer(id) {
    // В будущем здесь может быть логика, например, проверка,
    // можно ли деактивировать этого игрока (например, если он капитан активной семьи).
    return this.playerRepository.deactivate(id);
  }
}

export const playerService = new PlayerService(playerRepository); 