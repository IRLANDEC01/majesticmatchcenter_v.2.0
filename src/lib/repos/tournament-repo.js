import mongoose from 'mongoose';
import Tournament from '@/models/tournament/Tournament.js';
import PlayerMapParticipation from '@/models/player/PlayerMapParticipation.js';
import { cache } from '@/lib/cache/index.js';

class TournamentRepository {
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

export const tournamentRepository = new TournamentRepository(); 