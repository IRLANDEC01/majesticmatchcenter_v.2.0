import { tournamentRepository } from '@/lib/repos/tournaments/tournament-repo.js';
import { tournamentTemplateRepository } from '@/lib/repos/tournament-templates/tournament-template-repo.js';
import Tournament from '@/models/tournament/Tournament.js';

class TournamentService {
  constructor(repository, templateRepo) {
    this.tournamentRepository = repository;
    this.tournamentTemplateRepository = templateRepo;
  }
  
  /**
   * Создает новый турнир на основе шаблона и генерирует уникальный slug.
   * @param {object} tournamentData - Данные для создания турнира.
   * @returns {Promise<object>} - Созданный объект турнира.
   */
  async createTournament(tournamentData) {
    const { template: templateId } = tournamentData;

    if (!templateId) {
      throw new Error('Template ID is required to create a tournament.');
    }
    
    const template = await this.tournamentTemplateRepository.incrementUsageCount(templateId);
    if (!template) {
      throw new Error(`TournamentTemplate with id ${templateId} not found.`);
    }

    const slug = `${template.slug}-${template.usageCount}`;

    const newTournamentData = {
      ...tournamentData,
      slug,
      status: 'planned',
    };
    
    return this.tournamentRepository.create(newTournamentData);
  }

  async getTournaments(options) {
    return this.tournamentRepository.findAll(options);
  }

  async getTournamentById(id, options) {
    return this.tournamentRepository.findById(id, options);
  }

  async updateTournament(id, data) {
    return this.tournamentRepository.update(id, data);
  }

  async archiveTournament(id) {
    return this.tournamentRepository.archiveById(id);
  }

  async restoreTournament(id) {
    return this.tournamentRepository.restoreById(id);
  }

  async getStats(id) {
    return this.tournamentRepository.getTournamentStats(id);
  }
}

// Экспортируем и класс, и инстанс для гибкости
export { TournamentService };
export const tournamentService = new TournamentService(tournamentRepository, tournamentTemplateRepository); 