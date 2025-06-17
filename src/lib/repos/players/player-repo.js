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
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const cacheKey = `player:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const player = await Player.findById(id).lean();
    if (player) {
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
    const cacheKey = `player:slug:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const player = await Player.findOne({ slug }).lean();
    if (player) {
      await cache.set(cacheKey, player, {
        tags: [`player:${player._id}`, 'players_list'],
      });
    }
    return player;
  }

  /**
   * Находит всех игроков.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeInactive=false] - Включить неактивных игроков.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ includeInactive = false } = {}) {
    const query = {};
    if (!includeInactive) {
      query.status = 'active';
    }
    return Player.find(query).lean();
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
   * Деактивирует игрока (мягкое удаление).
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async deactivate(id) {
    const player = await Player.findByIdAndUpdate(id, { status: 'inactive' }, { new: true }).lean();
    if (player) {
      await cache.invalidateByTag(`player:${id}`);
      await cache.invalidateByTag(`player:slug:${player.slug}`);
      await cache.invalidateByTag('players_list');
    }
    return player;
  }
}

export const playerRepository = new PlayerRepository(); 