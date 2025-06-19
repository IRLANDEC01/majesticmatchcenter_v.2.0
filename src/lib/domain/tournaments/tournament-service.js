import { tournamentRepo } from '@/lib/repos/tournaments/tournament-repo';
import { familyRepo } from '@/lib/repos/families/family-repo';
import { playerRepo } from '@/lib/repos/players/player-repo';
import { tournamentTemplateRepo } from '@/lib/repos/tournament-templates/tournament-template-repo.js';
import { AppError, DuplicateError, NotFoundError, ValidationError } from '@/lib/errors';
import familyTournamentParticipationRepo from '@/lib/repos/families/family-tournament-participation-repo';
import familyEarningRepo from '@/lib/repos/families/family-earning-repo';
import playerEarningRepo from '@/lib/repos/players/player-earning-repo';

/**
 * Сервис для управления бизнес-логикой турниров.
 */
class TournamentService {
  /**
   * @param {object} repos - Репозитории.
   * @param {tournamentRepo} repos.tournamentRepo - Репозиторий турниров.
   * @param {familyRepo} repos.familyRepo - Репозиторий семей.
   * @param {playerRepo} repos.playerRepo - Репозиторий игроков.
   * @param {familyTournamentParticipationRepo} repos.familyTournamentParticipationRepo - Репозиторий участий семей в турнирах.
   * @param {familyEarningRepo} repos.familyEarningRepo - Репозиторий призовых семей.
   * @param {playerEarningRepo} repos.playerEarningRepo - Репозиторий призовых игроков.
   */
  constructor(repos) {
    this.tournamentRepo = repos.tournamentRepo;
    this.familyRepo = repos.familyRepo;
    this.playerRepo = repos.playerRepo;
    this.familyTournamentParticipationRepo = repos.familyTournamentParticipationRepo;
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

  async archive(id) {
    return this.tournamentRepo.archive(id);
  }

  async unarchiveTournament(id) {
    return this.tournamentRepo.unarchive(id);
  }

  async getStats(id) {
    return this.tournamentRepo.getTournamentStats(id);
  }

  async completeTournament(tournamentId, payload) {
    const tournament = await this.tournamentRepo.findById(tournamentId, { 
      populate: {
        path: 'participants.family',
        populate: {
          path: 'members.player',
        },
      },
    });
    if (!tournament) {
      throw new NotFoundError(`Турнир с ID ${tournamentId} не найден.`);
    }
    if (tournament.status === 'completed') {
      throw new ValidationError('Турнир уже завершен.');
    }

    let placements = payload.placements || [];

    // Сценарий 1: Автоматический подсчет для LEADERBOARD
    if (tournament.scoringType === 'LEADERBOARD') {
      const leaderboard = await this.tournamentRepo.getLeaderboard(tournamentId);
      if (leaderboard.length > 1 && leaderboard[0].totalPoints === leaderboard[1].totalPoints) {
        throw new AppError('Обнаружена ничья за первое место. Завершение невозможно.', 409);
      }
      placements = leaderboard.map((item, index) => ({
        place: index + 1,
        familyId: item.familyId.toString(),
      }));
    }

    if (placements.length === 0) {
      throw new ValidationError('Не предоставлены данные о расстановке мест (placements).');
    }

    const winnerPlacement = placements.find((p) => p.place === 1);
    if (!winnerPlacement) {
      throw new ValidationError('Не определен победитель (1-е место).');
    }

    // Основная логика начисления призов
    for (const placement of placements) {
      const prizesForPlace = tournament.prizePool.filter((p) => p.place === placement.place);
      if (prizesForPlace.length === 0) continue;

      const family = tournament.participants.find(p => p.family?._id.toString() === placement.familyId)?.family;
      if (!family) {
        throw new AppError(`Семья с ID ${placement.familyId} не найдена среди участников.`, 400);
      }
      
      const earningsForUpdate = [];

      for (const prize of prizesForPlace) {
        await this.familyEarningRepo.create({
          familyId: family._id,
          tournamentId,
          place: prize.place,
          currency: prize.currency,
          amount: prize.amount,
        });

        const playerShare = prize.amount / family.members.length;
        for (const member of family.members) {
          await this.playerEarningRepo.create({
            playerId: member.player._id,
            familyId: family._id,
            tournamentId,
            currency: prize.currency,
            amount: playerShare,
          });
        }
        
        earningsForUpdate.push({ currency: prize.currency, amount: prize.amount });
      }
      
      await this.familyTournamentParticipationRepo.updateByFamilyAndTournament(
        family._id,
        tournamentId,
        {
          finalPlace: placement.place,
          $push: { earnings: { $each: earningsForUpdate } },
        }
      );
    }
    
    // TODO: Поставить асинхронные задачи в очередь на пересчет статистики

    // Обновляем сам турнир
    const updatedTournament = await this.tournamentRepo.update(tournamentId, {
      status: 'completed',
      winner: winnerPlacement.familyId,
      endDate: new Date(),
    });

    return updatedTournament;
  }
}

export const tournamentService = new TournamentService({
  tournamentRepo,
  familyRepo,
  playerRepo,
  familyTournamentParticipationRepo,
  familyEarningRepo,
  playerEarningRepo,
});