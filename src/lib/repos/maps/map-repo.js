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
}

export const mapRepo = new MapRepository(); 