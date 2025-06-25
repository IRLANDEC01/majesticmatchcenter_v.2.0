import { IMapTemplate } from '@/models/map/MapTemplate';
import BaseRepo, { IBaseRepo } from '../base-repo';
import MapTemplate from '@/models/map/MapTemplate';

/**
 * @class MapTemplateRepository
 * @description Репозиторий для работы с шаблонами карт.
 *              Наследует все базовые CRUD-операции от BaseRepo.
 */
export interface IMapTemplateRepo extends IBaseRepo<IMapTemplate> {
  // Тут можно будет добавлять специфичные для этого репозитория методы
}

class MapTemplateRepo extends BaseRepo<IMapTemplate> implements IMapTemplateRepo {
  constructor() {
    // Передаем модель и префикс для кеша в родительский конструктор
    super(MapTemplate, 'map-template');
  }

  // Все стандартные методы (find, findById, create, update, archive, restore)
  // наследуются из BaseRepo и автоматически работают с кешем и теперь
  // являются полностью типобезопасными благодаря <IMapTemplate>.

  // Здесь можно добавлять специфичные для MapTemplate методы, если они понадобятся.
  // Например, поиск по какому-то уникальному полю.
}

const mapTemplateRepo = new MapTemplateRepo();
export default mapTemplateRepo;