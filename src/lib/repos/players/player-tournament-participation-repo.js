import models from '@/models/index.js';

const { PlayerTournamentParticipation } = models;

class PlayerTournamentParticipationRepo {
  /**
   * Обновляет или создает запись об участии игрока в турнире.
   * Использует `findOneAndUpdate` с `upsert: true`, чтобы атомарно
   * выполнить операцию: если запись существует, она обновится; если нет — создастся.
   * @param {string} playerId - ID игрока.
   * @param {string} tournamentId - ID турнира.
   * @param {object} data - Данные для обновления.
   * @returns {Promise<PlayerTournamentParticipation>}
   */
  async updateByPlayerAndTournament(playerId, tournamentId, data) {
    const filter = { playerId, tournamentId };
    
    // Опция { new: true } возвращает обновленный документ.
    // Опция { upsert: true } создает документ, если он не найден.
    return PlayerTournamentParticipation.findOneAndUpdate(filter, data, { new: true, upsert: true });
  }
}

const playerTournamentParticipationRepo = new PlayerTournamentParticipationRepo();

export default playerTournamentParticipationRepo; 