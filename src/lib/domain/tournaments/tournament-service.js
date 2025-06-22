import TournamentRepo from '@/lib/repos/tournaments/tournament-repo';
import FamilyRepo from '@/lib/repos/families/family-repo';
import PlayerRepo from '@/lib/repos/players/player-repo';
import TournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo.js';
import { AppError, DuplicateError, NotFoundError, ValidationError } from '@/lib/errors';
import FamilyTournamentParticipationRepo from '@/lib/repos/families/family-tournament-participation-repo';
import FamilyEarningRepo from '@/lib/repos/families/family-earning-repo';
import PlayerEarningRepo from '@/lib/repos/players/player-earning-repo';
import PlayerTournamentParticipationRepo from '@/lib/repos/players/player-tournament-participation-repo';
import { STATUSES } from '@/lib/constants';

/**
 * Сервис для управления бизнес-логикой турниров.
 */
export default class TournamentService {
  /**
   * @param {object} repos - Репозитории.
   * @param {TournamentRepo} repos.tournamentRepo - Репозиторий турниров.
   * @param {TournamentTemplateRepo} repos.tournamentTemplateRepo - Репозиторий шаблонов турниров.
   * @param {FamilyRepo} repos.familyRepo - Репозиторий семей.
   * @param {PlayerRepo} repos.playerRepo - Репозиторий игроков.
   * @param {FamilyTournamentParticipationRepo} repos.familyTournamentParticipationRepo - Репозиторий участий семей в турнирах.
   * @param {PlayerTournamentParticipationRepo} repos.playerTournamentParticipationRepo - Репозиторий участий игроков в турнирах.
   * @param {FamilyEarningRepo} repos.familyEarningRepo - Репозиторий призовых семей.
   * @param {PlayerEarningRepo} repos.playerEarningRepo - Репозиторий призовых игроков.
   */
  constructor(repos) {
    this.tournamentRepo = repos.tournamentRepo;
    this.tournamentTemplateRepo = repos.tournamentTemplateRepo;
    this.familyRepo = repos.familyRepo;
    this.playerRepo = repos.playerRepo;
    this.familyTournamentParticipationRepo = repos.familyTournamentParticipationRepo;
    this.playerTournamentParticipationRepo = repos.playerTournamentParticipationRepo;
    this.familyEarningRepo = repos.familyEarningRepo;
    this.playerEarningRepo = repos.playerEarningRepo;
  }

  /**
   * Создает новый турнир на основе шаблона и генерирует уникальный slug.
   * @param {object} tournamentData - Данные для создания турнира.
   * @returns {Promise<object>} - Созданный объект турнира.
   */
  async createTournament(tournamentData) {
    const validatedData = tournamentData; // Прямое использование данных после валидации в API

    const template = await this.tournamentTemplateRepo.incrementUsageCount(validatedData.template);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с id ${validatedData.template} не найден.`);
    }

    const slug = `${template.slug}-${template.usageCount}`;

    const newTournamentData = {
      ...validatedData,
      description: template.description,
      rules: template.rules,
      slug,
      status: STATUSES.PLANNED,
    };
    
    // Наследуем prizePool из шаблона, если он не передан в запросе или передан пустым
    if (!validatedData.prizePool || validatedData.prizePool.length === 0) {
      newTournamentData.prizePool = template.prizePool;
    }

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

  async archive(id) {
    return this.tournamentRepo.archive(id);
  }

  async unarchiveTournament(id) {
    return this.tournamentRepo.unarchive(id);
  }

  async getStats(id) {
    return this.tournamentRepo.getTournamentStats(id);
  }

  /**
   * Завершает турнир, распределяет призы и обновляет всю связанную статистику.
   * Этот метод является идемпотентным для начисления призов, но не для обновления статуса.
   * @param {string} tournamentId - ID турнира для завершения.
   * @param {object} payload - Данные для завершения.
   * @param {Array<object>} payload.outcomes - Массив с результатами участников.
   * @param {string} payload.outcomes[].familyId - ID семьи.
   * @param {string} payload.outcomes[].tier - Категория результата (например, 'winner').
   * @param {number} [payload.outcomes[].rank] - Числовое место (если применимо).
   * @returns {Promise<object>} - Обновленный объект турнира.
   */
  async completeTournament(tournamentId, { outcomes }) {
    if (!outcomes || outcomes.length === 0) {
      throw new ValidationError('Необходимо предоставить массив результатов (outcomes).');
    }

    const tournament = await this.tournamentRepo.findById(tournamentId, { 
      populate: {
        path: 'participants.family',
        populate: { path: 'members.player' },
      },
    });

    if (!tournament) {
      throw new NotFoundError(`Турнир с ID ${tournamentId} не найден.`);
    }
    if (tournament.status === STATUSES.COMPLETED) {
      throw new ValidationError('Турнир уже завершен.');
    }

    // 1. Определение победителя
    const winnerOutcome = outcomes.find(o => o.tier === 'winner' || o.rank === 1);
    if (!winnerOutcome) {
      throw new ValidationError('Не определен победитель (должен быть tier: "winner" или rank: 1).');
    }

    // 2. Обработка каждого результата
    for (const outcome of outcomes) {
      const { familyId, tier, rank } = outcome;

      const family = tournament.participants.find(p => p.family?._id.toString() === familyId.toString())?.family;
      if (!family) {
        throw new AppError(`Семья с ID ${familyId} не найдена среди участников турнира.`, 400);
      }
      
      const earningsForUpdate = [];

      // Ищем подходящие правила в призовом фонде
      const applicablePrizes = tournament.prizePool.filter(prize => 
        (prize.target.tier && prize.target.tier === tier) || 
        (prize.target.rank && prize.target.rank === rank)
      );

      for (const prize of applicablePrizes) {
        // Создаем запись о заработке для семьи
        await this.familyEarningRepo.create({
          familyId: family._id,
          tournamentId,
          tier,
          rank,
          currency: prize.currency,
          amount: prize.amount,
        });

        const playerShare = prize.amount / family.members.length;

        // Создаем записи о заработке для каждого игрока
        for (const member of family.members) {
          await this.playerEarningRepo.create({
            playerId: member.player._id,
            familyId: family._id,
            tournamentId,
            currency: prize.currency,
            amount: playerShare,
          });

          // Обновляем "витрину" участия игрока
          await this.playerTournamentParticipationRepo.updateByPlayerAndTournament(
            member.player._id, tournamentId, { $push: { earnings: prize } }
          );
        }
        
        earningsForUpdate.push(prize);
      }
      
      // Обновляем "витрину" участия семьи
      await this.familyTournamentParticipationRepo.updateByFamilyAndTournament(
        family._id,
        tournamentId,
        {
          result: { tier, rank },
          $push: { earnings: { $each: earningsForUpdate } },
        }
      );
    }
    
    // 3. TODO: Поставить асинхронные задачи в очередь на пересчет статистики

    // 4. Финальное обновление самого турнира
    const updatedTournament = await this.tournamentRepo.update(tournamentId, {
      status: STATUSES.COMPLETED,
      winner: winnerOutcome.familyId,
      endDate: new Date(),
    });

    return updatedTournament;
  }
}
