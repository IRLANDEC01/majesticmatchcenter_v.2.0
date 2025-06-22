import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import BaseRepo from '../base-repo.js';

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

  // Все стандартные методы (find, findById, create, update, archive, restore)
  // наследуются из BaseRepo и автоматически работают с кешем.
}

const tournamentTemplateRepo = new TournamentTemplateRepository();
export default tournamentTemplateRepo;