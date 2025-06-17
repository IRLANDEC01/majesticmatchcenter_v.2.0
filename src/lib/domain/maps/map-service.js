import { mapRepo } from '@/lib/repos/maps/map-repo';
import Map from '@/models/map/Map';
import Tournament from '@/models/tournament/Tournament.js';
import { mapTemplateRepository } from '@/lib/repos/map-templates/map-template-repo.js';

/**
 * Сервис для управления бизнес-логикой, связанной с картами.
 */
class MapService {
  /**
   * Получает карту по ID через репозиторий.
   * @param {string} id - ID карты.
   * @returns {Promise<object|null>}
   */
  async getMapById(id) {
    return mapRepo.findById(id);
  }

  /**
   * Получает все карты через репозиторий.
   * @param {object} [options] - Опции.
   * @param {boolean} [options.includeArchived=false] - Включить ли архивированные.
   * @returns {Promise<object[]>}
   */
  async getAllMaps({ includeArchived = false } = {}) {
    return mapRepo.getAll({ includeArchived });
  }

  /**
   * Создает новую карту.
   * @param {object} mapData - Данные для создания карты.
   * @returns {Promise<object>}
   */
  async createMap(mapData) {
    const map = new Map(mapData);
    await map.save();
    return map.toObject();
  }

  /**
   * Архивирует карту.
   * @param {string} mapId - ID карты для архивации.
   */
  async archiveMap(mapId) {
    // TODO: Добавить бизнес-логику, например, проверку, что нельзя архивировать активную карту
    return mapRepo.archive(mapId);
  }
  
  /**
   * Восстанавливает карту из архива.
   * @param {string} mapId - ID карты для восстановления.
   */
  async unarchiveMap(mapId) {
    return mapRepo.unarchive(mapId);
  }

  /**
   * Обновляет карту.
   * @param {string} id - ID карты.
   * @param {object} updateData - Данные для обновления.
   * @returns {Promise<object|null>}
   */
  async updateMap(id, updateData) {
    const map = await Map.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    return map;
  }
}

export const mapService = new MapService(); 