import { getCacheAdapter } from '@/lib/cache';
import Map from '@/models/map/Map';
import BaseRepo from '@/lib/repos/base-repo';
import { AppError } from '@/lib/errors';

/**
 * Репозиторий для управления картами (Maps).
 * @extends {BaseRepo}
 */
class MapRepo extends BaseRepo {
  constructor() {
    super(Map, 'map');
  }

  // Здесь можно будет в будущем добавлять специфичные для карт методы,
  // которых нет в BaseRepo. Например:
  //
  // async findActiveMapsByTournament(tournamentId) {
  //   return this.model.find({ 
  //     tournament: tournamentId, 
  //     status: 'ACTIVE',
  //     archivedAt: null 
  //   }).lean().exec();
  // }

  /**
   * Находит карту по ID.
   * По умолчанию ищет только среди активных (неархивированных) карт.
   * @param {string} id - ID карты.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить в поиск архивированные карты.
   * @returns {Promise<object|null>}
   */
  async findById(id, options = {}) {
    const { includeArchived = false } = options;
    const query = { _id: id };

    if (!includeArchived) {
      query.archivedAt = null;
    }

    return this.model.findOne(query).lean().exec();
  }

  /**
   * Создает новую карту.
   */
  async create(data) {
    // Implementation of create method
  }

  /**
   * Получает все карты с возможностью фильтрации и пагинации.
   * @param {object} [options={}] - Опции для запроса.
   * @param {boolean} [options.includeArchived=false] - Включить архивированные.
   * @returns {Promise<Array<object>>}
   */
  async getAll(options = {}) {
    const { includeArchived = false } = options;
    const query = {};

    if (!includeArchived) {
      query.archivedAt = null;
    }
    
    // Здесь можно будет добавить логику пагинации и сортировки
    return this.model.find(query).lean().exec();
  }
  
  /**
   * Считает количество карт в турнире.
   * @param {string} tournamentId - ID турнира.
   * @returns {Promise<number>}
   */
  async countByTournamentId(tournamentId) {
    return this.model.countDocuments({ tournament: tournamentId, archivedAt: null });
  }
}

export default MapRepo;