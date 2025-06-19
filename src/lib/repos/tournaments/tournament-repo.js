import mongoose from 'mongoose';
import Tournament from '@/models/tournament/Tournament.js';
import PlayerMapParticipation from '@/models/player/PlayerMapParticipation.js';
import Map from '@/models/map/Map.js';
import { cache } from '@/lib/cache/index.js';
import { NotFoundError } from '@/lib/errors.js';
import FamilyMapParticipation from '@/models/family/FamilyMapParticipation.js';

class TournamentRepo {
  /**
   * Находит турнир по ID.
   * @param {string} id - ID турнира.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включать ли архивированные.
   * @param {string|object|Array} [options.populate=null] - Опции для Mongoose populate.
   * @returns {Promise<object|null>}
   */
  async findById(id, { includeArchived = false, populate = null } = {}) {
    const cacheKey = `tournament:${id}`;
    if (!includeArchived) {
      const cachedTournament = await cache.get(cacheKey);
      if (cachedTournament) {
        return cachedTournament;
      }
    }

    const query = Tournament.findById(id);

    if (populate) {
      query.populate(populate);
    }

    if (includeArchived) {
      query.setOptions({ includeArchived: true });
    }

    const tournament = await query.lean();

    if (tournament && !includeArchived) {
      await cache.set(cacheKey, tournament, { tags: [`tournament:${tournament._id}`, `tournament:slug:${tournament.slug}`, 'tournaments_list'] });
    }
    return tournament;
  }
  
  /**
   * Находит турнир по слагу.
   * @param {string} slug - Слаг турнира.
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    const cacheKey = `tournament:slug:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached?.archivedAt) return null;
    if (cached) return cached;

    const tournament = await Tournament.findOne({ slug, archivedAt: null }).lean();
    if (tournament) {
      await cache.set(cacheKey, tournament, {
        tags: [`tournament:${tournament._id}`, `tournament:slug:${slug}`, 'tournaments_list'],
      });
    }
    return tournament;
  }

  /**
   * Находит все турниры.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить архивированные.
   * @returns {Promise<Array<object>>}
   */
  async findAll({ includeArchived = false } = {}) {
    const query = includeArchived ? {} : { archivedAt: null };
    return Tournament.find(query).sort({ startDate: -1 }).lean();
  }

  /**
   * Создает новый турнир.
   * @param {object} data - Данные для создания.
   * @returns {Promise<object>}
   */
  async create(data) {
    const tournament = new Tournament(data);
    await tournament.save();
    await cache.invalidateByTag('tournaments_list');
    return tournament.toObject();
  }

  /**
   * Обновляет данные турнира.
   * @param {string} id - ID турнира.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<object|null>}
   */
  async update(id, data) {
    const tournament = await Tournament.findByIdAndUpdate(id, data, { new: true }).lean();
    if (tournament) {
      await this._invalidateCache(tournament);
    }
    return tournament;
  }

  /**
   * Архивирует турнир по ID.
   * @param {string} id - ID турнира.
   * @returns {Promise<object>}
   * @throws {NotFoundError} Если турнир не найден.
   */
  async archive(id) {
    const tournament = await Tournament.findOneAndUpdate(
      { _id: id, archivedAt: { $exists: false } },
      { $set: { archivedAt: new Date() } },
      { new: true }
    ).setOptions({ includeArchived: true }).lean();

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    await this._invalidateCache(tournament);
    return tournament;
  }

  /**
   * Восстанавливает турнир по ID.
   * @param {string} id - ID турнира.
   * @returns {Promise<object|null>}
   */
  async unarchive(id) {
    const tournament = await Tournament.findByIdAndUpdate(
      id,
      { $unset: { archivedAt: 1 } },
      { new: true }
    ).lean();
    
    if (tournament) {
      await this._invalidateCache(tournament);
    }
    return tournament;
  }

  /**
   * Добавляет участника в турнир.
   * @param {string} tournamentId - ID турнира.
   * @param {object} participant - Объект участника.
   * @returns {Promise<object>}
   */
  async addParticipant(tournamentId, participant) {
    const tournament = await Tournament.findByIdAndUpdate(
      tournamentId,
      { $addToSet: { participants: participant } },
      { new: true }
    ).lean();
    if (tournament) {
      await this._invalidateCache(tournament);
    }
    return tournament;
  }

  /**
   * Удаляет участника из турнира.
   * @param {string} tournamentId - ID турнира.
   * @param {string} participantId - ID участника.
   * @returns {Promise<object>}
   */
  async removeParticipant(tournamentId, participantId) {
    const tournament = await Tournament.findByIdAndUpdate(
      tournamentId,
      { $pull: { participants: { _id: participantId } } },
      { new: true }
    ).lean();
    if (tournament) {
      await this._invalidateCache(tournament);
    }
    return tournament;
  }

  /**
   * Находит карты в турнире, где участвует определенный участник.
   * @param {string} tournamentId - ID турнира.
   * @param {string} participantId - ID участника.
   * @returns {Promise<Array<object>>}
   */
  async findMapsWithParticipant(tournamentId, participantId) {
    return Map.find({
      tournament: tournamentId,
      'participants.family': participantId, // Предполагаем, что participantId - это ID семьи
    }).lean();
  }

  /**
   * Инвалидирует кэш для турнира.
   * @param {object} tournament - Объект турнира.
   * @private
   */
  async _invalidateCache(tournament) {
    if (!tournament) return;
    const tags = [
        `tournament:${tournament._id}`,
        `tournament:slug:${tournament.slug}`,
        'tournaments_list'
    ];
    for (const tag of tags) {
        await cache.invalidateByTag(tag);
    }
  }

  /**
   * Рассчитывает и возвращает лидерборд для турнира на основе очков.
   * @param {string} tournamentId - ID турнира.
   * @returns {Promise<Array<object>>} - Отсортированный массив { familyId, totalPoints }.
   */
  async getLeaderboard(tournamentId) {
    // Этот метод не кэшируется, так как вызывается только в момент завершения турнира.
    return FamilyMapParticipation.aggregate([
      // 1. Найти все участия, относящиеся к этому турниру
      {
        $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) }
      },
      // 2. Сгруппировать по ID семьи и суммировать очки
      {
        $group: {
          _id: '$familyId',
          totalPoints: { $sum: '$tournamentPoints' }
        }
      },
      // 3. Отсортировать по убыванию очков
      {
        $sort: { totalPoints: -1 }
      },
      // 4. Сформировать финальный объект
      {
        $project: {
          _id: 0,
          familyId: '$_id',
          totalPoints: '$totalPoints'
        }
      }
    ]);
  }

  /**
   * Получает агрегированную статистику по игрокам за весь турнир.
   * Результат кэшируется.
   * @param {string} tournamentId - ID турнира.
   * @returns {Promise<object[]>} - Массив объектов со статистикой по каждому игроку.
   */
  async getTournamentStats(tournamentId) {
    const cacheKey = `stats:tournament:${tournamentId}`;

    const cachedStats = await cache.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = await PlayerMapParticipation.aggregate([
      // 1. Находим все записи, относящиеся к нужному турниру
      { $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) } },
      
      // 2. Группируем по ID игрока и считаем суммы
      {
        $group: {
          _id: '$playerId',
          kills: { $sum: '$kills' },
          deaths: { $sum: '$deaths' },
          damageDealt: { $sum: '$damageDealt' },
          mapsPlayed: { $sum: 1 }
        }
      },

      // 3. (Опционально) "Джойним" данные игрока для отображения имени
      {
        $lookup: {
          from: 'players', // Название коллекции игроков
          localField: '_id',
          foreignField: '_id',
          as: 'playerInfo'
        }
      },

      // 4. "Разворачиваем" массив playerInfo (там будет 1 элемент)
      { $unwind: '$playerInfo' },

      // 5. Формируем финальный вид объекта
      {
        $project: {
          _id: 0, // убираем _id
          playerId: '$_id',
          fullName: { $concat: ['$playerInfo.firstName', ' ', '$playerInfo.lastName'] },
          slug: '$playerInfo.slug',
          kills: '$kills',
          deaths: '$deaths',
          damageDealt: '$damageDealt',
          mapsPlayed: '$mapsPlayed',
          kd: { $divide: ['$kills', { $max: [1, '$deaths'] }] } // избегаем деления на ноль
        }
      },

      // 6. Сортируем по убийствам
      { $sort: { kills: -1 } }
    ]);

    // Кэшируем результат на 5 минут
    await cache.set(cacheKey, stats, { ttl: 300, tags: [`tournament:${tournamentId}`] });

    return stats;
  }
}

export const tournamentRepo = new TournamentRepo(); 