import { tournamentRepo } from '@/lib/repos/tournaments/tournament-repo';
import { familyRepo } from '@/lib/repos/families/family-repo';
import { playerRepo } from '@/lib/repos/players/player-repo';
import { tournamentTemplateRepo } from '@/lib/repos/tournament-templates/tournament-template-repo.js';
import { z } from 'zod';
import { AppError, DuplicateError, NotFoundError, ValidationError } from '@/lib/errors';

const tournamentParticipantSchema = z.object({
  participantType: z.enum(['family', 'team']),
  family: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val)).optional(),
  teamName: z.string().trim().min(1).optional(),
}).refine(data => (data.participantType === 'family' && data.family) || (data.participantType === 'team' && data.teamName), {
  message: "Для 'family' нужен 'family' ID, для 'team' нужно 'teamName'",
});

const tournamentSchema = z.object({
  name: z.string().trim().min(1, 'Название турнира обязательно.'),
  template: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Некорректный ID шаблона.'),
  tournamentType: z.enum(['family', 'team'], { required_error: 'Тип турнира обязателен.' }),
  startDate: z.coerce.date({ required_error: 'Дата начала обязательна.' }),
  participants: z.array(tournamentParticipantSchema).min(1, 'Нужен хотя бы один участник.'),
  prizePool: z.array(z.object({
    currency: z.string(),
    amount: z.number().positive(),
    distribution: z.record(z.number())
  })).optional(),
});

/**
 * Сервис для управления бизнес-логикой турниров.
 */
class TournamentService {
  /**
   * @param {object} repos - Репозитории.
   * @param {tournamentRepo} repos.tournamentRepo - Репозиторий турниров.
   * @param {familyRepo} repos.familyRepo - Репозиторий семей.
   * @param {playerRepo} repos.playerRepo - Репозиторий игроков.
   */
  constructor(repos) {
    this.tournamentRepo = repos.tournamentRepo;
    this.familyRepo = repos.familyRepo;
    this.playerRepo = repos.playerRepo;
  }

  /**
   * Создает новый турнир на основе шаблона и генерирует уникальный slug.
   * @param {object} tournamentData - Данные для создания турнира.
   * @returns {Promise<object>} - Созданный объект турнира.
   */
  async createTournament(tournamentData) {
    const validationResult = tournamentSchema.safeParse(tournamentData);
    if (!validationResult.success) {
      throw new ValidationError('Ошибка валидации', validationResult.error.flatten().fieldErrors);
    }
    const validatedData = validationResult.data;

    const template = await tournamentTemplateRepo.incrementUsageCount(validatedData.template);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с id ${validatedData.template} не найден.`);
    }

    const slug = `${template.slug}-${template.usageCount}`;

    const newTournamentData = {
      ...validatedData,
      slug,
      status: 'planned',
    };
    
    return this.tournamentRepo.create(newTournamentData);
  }

  /**
   * Добавляет участника в турнир.
   * @param {string} tournamentId - ID турнира.
   * @param {object} participant - Участник.
   * @returns {Promise<object>}
   */
  async addParticipant(tournamentId, participant) {
    // TODO: Валидация участника
    return this.tournamentRepo.addParticipant(tournamentId, participant);
  }

  /**
   * Удаляет участника из турнира.
   * @param {string} tournamentId - ID турнира.
   * @param {string} participantId - ID участника.
   * @returns {Promise<object>}
   */
  async removeParticipant(tournamentId, participantId) {
    const mapsWithParticipant = await this.tournamentRepo.findMapsWithParticipant(tournamentId, participantId);
    if (mapsWithParticipant.length > 0) {
      throw new AppError('Нельзя удалить участника, который задействован хотя бы в одной карте турнира.', 400);
    }
    return this.tournamentRepo.removeParticipant(tournamentId, participantId);
  }

  async getAll(options) {
    return this.tournamentRepo.findAll(options);
  }

  async getById(id, options) {
    return this.tournamentRepo.findById(id, options);
  }

  async updateTournament(id, data) {
    return this.tournamentRepo.update(id, data);
  }

  async archiveTournament(id) {
    return this.tournamentRepo.archive(id);
  }

  async unarchiveTournament(id) {
    return this.tournamentRepo.unarchive(id);
  }

  async getStats(id) {
    return this.tournamentRepo.getTournamentStats(id);
  }
}

export const tournamentService = new TournamentService({
  tournamentRepo,
  familyRepo,
  playerRepo,
});