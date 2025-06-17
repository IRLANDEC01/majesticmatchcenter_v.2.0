import { tournamentRepo } from '@/lib/repos/tournaments/tournament-repo.js';
import { tournamentTemplateRepo } from '@/lib/repos/tournament-templates/tournament-template-repo.js';

class TournamentService {
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
    
    const template = await tournamentTemplateRepo.incrementUsageCount(templateId);
    if (!template) {
      throw new Error(`TournamentTemplate with id ${templateId} not found.`);
    }

    const slug = `${template.slug}-${template.usageCount}`;

    const newTournamentData = {
      ...tournamentData,
      slug,
      status: 'planned',
    };
    
    return tournamentRepo.create(newTournamentData);
  }

  async getTournaments(options) {
    return tournamentRepo.findAll(options);
  }

  async getTournamentById(id, options) {
    return tournamentRepo.findById(id, options);
  }

  async updateTournament(id, data) {
    return tournamentRepo.update(id, data);
  }

  async archiveTournament(id) {
    return tournamentRepo.archive(id);
  }

  async unarchiveTournament(id) {
    return tournamentRepo.unarchive(id);
  }

  async getStats(id) {
    return tournamentRepo.getTournamentStats(id);
  }
}

export const tournamentService = new TournamentService();