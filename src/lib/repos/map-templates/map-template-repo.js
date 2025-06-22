import BaseRepo from '../base-repo';
import MapTemplate from '@/models/map/MapTemplate.js';

/**
 * @class MapTemplateRepository
 * @description Репозиторий для работы с шаблонами карт.
 * @extends {BaseRepo}
 */
class MapTemplateRepo extends BaseRepo {
  constructor() {
    // Передаем модель и префикс для кеша в родительский конструктор
    super(MapTemplate, 'map-template');
  }

  // Все стандартные методы (find, findById, create, update, archive, restore)
  // наследуются из BaseRepo и автоматически работают с кешем.

  // Здесь можно добавлять специфичные для MapTemplate методы, если они понадобятся.
  // Например, поиск по какому-то уникальному полю.
}

const mapTemplateRepo = new MapTemplateRepo();
export default mapTemplateRepo;