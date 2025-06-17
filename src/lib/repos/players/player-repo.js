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
    if (cached) {
      if (cached.archivedAt) return null;
      return cached;
    }

    const player = await Player.findOne({ _id: id, archivedAt: null }).lean();
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
    const cachedPlayer = await cache.get(cacheKey);
    if (cachedPlayer) {
      if (cachedPlayer.archivedAt) return null;
      return cachedPlayer;
    }

    const player = await Player.findOne({ slug, archivedAt: null }).lean();
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
   * @param {boolean} [options.includeArchived=false] - Включить архивированных игроков.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ includeArchived = false } = {}) {
    const query = {};
    if (!includeArchived) {
      query.archivedAt = null;
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
   * Архивирует игрока (мягкое удаление).
   * @param {string} id - ID игрока.
   * @returns {Promise<object|null>}
   */
  async archive(id) {
    const player = await Player.findOneAndUpdate(
      { _id: id, archivedAt: null },
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
      { new: true }
    ).lean();
    
    if (player) {
      await cache.invalidateByTag(`player:${id}`);
      await cache.invalidateByTag('players_list');
    }
    return player;
  }
}

export const playerRepository = new PlayerRepository(); 