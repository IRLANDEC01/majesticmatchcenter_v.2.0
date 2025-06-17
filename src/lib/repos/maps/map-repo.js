import Map from '@/models/map/Map';

/**
 * Репозиторий для работы с сущностью "Карта" (Map).
 * Инкапсулирует всю логику взаимодействия с базой данных.
 */
class MapRepository {
  /**
   * Находит карту по ID.
   * @param {string} id - ID карты.
   * @returns {Promise<Map|null>}
   */
  async findById(id) {
    return Map.findById(id).lean();
  }
  
  /**
   * Получает все карты с возможностью включения архивированных.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @returns {Promise<Map[]>}
   */
  async getAll({ includeArchived = false } = {}) {
    return Map.find({}, {}, { includeArchived }).lean();
  }

  /**
   * Создает новую карту.
   * @param {object} data - Данные для создания карты.
   * @returns {Promise<Map>}
   */
  async create(data) {
    const newMap = new Map(data);
    await newMap.save();
    return newMap.toObject();
  }

  /**
   * Обновляет карту по ID.
   * @param {string} id - ID карты.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<Map|null>}
   */
  async update(id, data) {
    return Map.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  }

  /**
   * Архивирует карту по ID.
   * Устанавливает поле archivedAt в текущую дату.
   * @param {string} id - ID карты для архивации.
   * @returns {Promise<Map|null>} - Обновленный документ карты.
   */
  async archive(id) {
    return Map.findByIdAndUpdate(id, { $set: { archivedAt: new Date() } }, { new: true }).lean();
  }

  /**
   * Восстанавливает карту из архива по ID.
   * Удаляет поле archivedAt.
   * @param {string} id - ID карты для восстановления.
   * @returns {Promise<Map|null>} - Обновленный документ карты.
   */
  async unarchive(id) {
    return Map.findByIdAndUpdate(id, { $unset: { archivedAt: 1 } }, { new: true, includeArchived: true }).lean();
  }

  async findBySlug(slug, tournamentId) {
    return Map.findOne({ slug, tournament: tournamentId }).lean();
  }
  
  /**
   * Считает количество карт в указанном турнире.
   * @param {string} tournamentId - ID турнира.
   * @returns {Promise<number>}
   */
  async countByTournamentId(tournamentId) {
    return Map.countDocuments({ tournament: tournamentId });
  }
}

export const mapRepo = new MapRepository(); 