import Tournament from '@/models/tournament/Tournament.js';
import Map from '@/models/map/Map.js';
import { mapTemplateRepository } from '@/lib/repos/map-template-repo.js';

class MapService {
  /**
   * Создает новую карту в рамках турнира.
   * @param {object} mapData - Данные для создания карты.
   * @returns {Promise<object>} - Созданный объект карты.
   */
  async createMap(mapData) {
    const { tournament: tournamentId, template: templateId, name, startDateTime, participants } = mapData;

    if (!tournamentId || !templateId) {
      throw new Error('Tournament ID and Template ID are required.');
    }

    // 1. Находим родительский турнир, чтобы получить его slug
    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) {
      throw new Error(`Tournament with id ${tournamentId} not found.`);
    }

    // 2. Находим шаблон карты для получения его slug
    const mapTemplate = await mapTemplateRepository.findById(templateId);
    if (!mapTemplate) {
      throw new Error(`MapTemplate with id ${templateId} not found.`);
    }
    
    // 3. Считаем, сколько карт уже есть в этом турнире, чтобы определить порядковый номер
    const mapOrder = await Map.countDocuments({ tournament: tournamentId }) + 1;

    // 4. Генерируем slug
    const slug = `${tournament.slug}-${mapTemplate.slug}-${mapOrder}`;

    // 5. Создаем и сохраняем карту
    const newMap = new Map({
      name,
      slug,
      tournament: tournamentId,
      template: templateId,
      status: 'planned',
      startDateTime,
      participants
    });

    await newMap.save();
    
    // TODO: Инвалидация кэша для родительского турнира
    // await cache.invalidateByTag(`tournament:${tournamentId}`);

    return newMap.toObject();
  }
}

export const mapService = new MapService(); 