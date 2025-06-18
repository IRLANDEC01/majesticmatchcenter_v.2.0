import Player from '@/models/player/Player.js';
import { cache } from '@/lib/cache';

/**
 * @class PlayerRepository
 * @description Репозиторий для работы с данными игроков.
 */
class PlayerRepository {
  /**
   * Находит игрока по ID.
   * @param {string} id - ID игрока.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированных игроков.
   * @returns {Promise<object|null>}
   */
  async findById(id, { includeArchived = false } = {}) {
    const cacheKey = `player:${id}`;
    if (!includeArchived) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    const player = await Player.findById(id).setOptions({ includeArchived }).lean();
    if (player && !includeArchived) {
      await cache.set(cacheKey, player, {
        tags: [`player:${id}`, 'players_list'],
      });
    }
    return player;
  }

  /**
   * Находит игрока по слагу.
   * @param {string} slug - Слаг игрока.
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    return Player.findOne({ slug, archivedAt: null }).lean();
  }

  /**
   * Находит игрока по имени и фамилии.
   * @param {string} firstName - Имя игрока.
   * @param {string} lastName - Фамилия игрока.
   * @returns {Promise<object|null>}
   */
  async findByName(firstName, lastName) {
    return Player.findOne({ firstName, lastName, archivedAt: null }).lean();
  }

  /**
   * Находит всех игроков.
   * @param {object} [options] - Опции.
   * @param {object} [options.filter={}] - MongoDB-фильтр.
   * @param {boolean} [options.includeArchived=false] - Включить архивированных игроков.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ filter = {}, includeArchived = false } = {}) {
    const query = includeArchived ? filter : { ...filter, archivedAt: null };
    return Player.find(query).setOptions({ includeArchived }).lean();
  }

  /**
   * Создает нового игрока.
   * @param {object} data - Данные для создания.
   * @returns {Promise<object>}
   */
  async create(data) {
    const player = new Player(data);
    await player.save();
    await cache.invalidateByTag('players_list');
    return player.toObject();
  }

  /**
   * Обновляет данные игрока.
   * @param {string} id - ID игрока.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<object|null>}
   */
  async update(id, data) {
    const player = await Player.findByIdAndUpdate(id, data, { new: true }).lean();
    if (player) {
      await cache.invalidateByTag(`player:${id}`);
      await cache.invalidateByTag('players_list');
    }
    return player;
  }

  /**
   * Архивирует игрока (мягкое удаление).
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    const player = await Player.findByIdAndUpdate(
      id,
      { $set: { archivedAt: new Date() } },
      { new: true }
    ).lean();

    if (player) {
      await cache.invalidateByTag(`player:${id}`);
      await cache.invalidateByTag('players_list');
    }
    return player;
  }

  /**
   * Восстанавливает игрока из архива.
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async unarchive(id) {
    const player = await Player.findByIdAndUpdate(
      id,
      { $unset: { archivedAt: 1 } },
      { new: true, includeArchived: true }
    ).lean();
    
    if (player) {
      await cache.invalidateByTag(`player:${id}`);
      await cache.invalidateByTag('players_list');
    }
    return player;
  }

  /**
   * Атомарно увеличивает рейтинг игрока.
   * @param {string} playerId - ID игрока.
   * @param {number} amount - Величина, на которую нужно увеличить рейтинг.
   * @returns {Promise<void>}
   */
  async incrementRating(playerId, amount) {
    if (amount === 0) return;

    const player = await Player.findByIdAndUpdate(
      playerId,
      { $inc: { rating: amount } },
      { new: true }
    ).lean();

    if (player) {
      await cache.invalidateByTag(`player:${player._id}`);
      await cache.invalidateByTag('players_list');
    }
  }
}

export const playerRepo = new PlayerRepository();