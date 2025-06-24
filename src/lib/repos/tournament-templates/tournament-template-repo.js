import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import BaseRepo from '@/lib/repos/base-repo';

/**
 * @class TournamentTemplateRepository
 * @description Репозиторий для работы с шаблонами турниров.
 * @extends {BaseRepo}
 */
class TournamentTemplateRepository extends BaseRepo {
  constructor() {
    // Передаем модель и префикс для кеша в родительский конструктор
    super(TournamentTemplate, 'tournament_template');
  }

  /**
   * @description Удаляет ID шаблона карты из всех шаблонов турниров.
   * Вызывается, когда шаблон карты архивируется.
   * @param {string} mapTemplateId - ID шаблона карты для удаления.
   */
  async removeMapTemplateFromAll(mapTemplateId) {
    await this.model.updateMany(
      {}, // Пустой фильтр для выбора всех документов
      { $pull: { mapTemplates: mapTemplateId } }
    );
  }

  // Все стандартные методы (find, findById, create, update, archive, restore)
  // наследуются из BaseRepo и автоматически работают с кешем.
}

const tournamentTemplateRepo = new TournamentTemplateRepository();
export default tournamentTemplateRepo;