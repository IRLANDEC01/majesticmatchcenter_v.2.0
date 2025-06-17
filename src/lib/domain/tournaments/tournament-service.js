import { tournamentTemplateRepository } from '@/lib/repos/tournament-template-repo.js';
import Tournament from '@/models/tournament/Tournament.js';

class TournamentService {
  /**
   * Создает новый турнир на основе шаблона и генерирует уникальный slug.
   * @param {object} tournamentData - Данные для создания турнира, включая name, description, template ID, etc.
   * @returns {Promise<object>} - Созданный объект турнира.
   */
  async createTournament(tournamentData) {
    const { template: templateId, name, description, tournamentType, startDate, prizePool, participants } = tournamentData;

    if (!templateId) {
      throw new Error('Template ID is required to create a tournament.');
    }

    // 1. Получаем шаблон и атомарно инкрементируем счетчик
    const template = await tournamentTemplateRepository.incrementUsageCount(templateId);
    if (!template) {
      throw new Error(`TournamentTemplate with id ${templateId} not found.`);
    }

    // 2. Генерируем новый slug
    const slug = `${template.slug}-${template.usageCount}`;

    // 3. Создаем и сохраняем новый турнир
    const tournament = new Tournament({
      name,
      slug,
      description,
      template: templateId,
      tournamentType,
      status: 'planned', // Статус по умолчанию при создании
      startDate,
      prizePool,
      participants
    });

    await tournament.save();

    // TODO: Инвалидировать кэш, связанный со списками турниров
    // await cache.invalidateByTag('tournaments_list');

    return tournament.toObject();
  }
}

export const tournamentService = new TournamentService(); 