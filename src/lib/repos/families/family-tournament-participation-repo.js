import models from '@/models';

const { FamilyTournamentParticipation } = models;

/**
 * Репозиторий для управления участием семей в турнирах.
 */
class FamilyTournamentParticipationRepo {
  /**
   * Создает запись об участии семьи в турнире.
   * @param {string} familyId - ID семьи.
   * @param {string} tournamentId - ID турнира.
   * @returns {Promise<Document>}
   */
  create(familyId, tournamentId) {
    return FamilyTournamentParticipation.create({ familyId, tournamentId });
  }

  /**
   * Находит и обновляет запись об участии семьи в турнире.
   * @param {string} familyId - ID семьи.
   * @param {string} tournamentId - ID турнира.
   * @param {object} updateData - Данные для обновления.
   * @returns {Promise<object>}
   */
  async updateByFamilyAndTournament(familyId, tournamentId, updateData) {
    return FamilyTournamentParticipation.findOneAndUpdate(
      { family: familyId, tournament: tournamentId },
      updateData,
      { new: true, upsert: true }
    ).lean();
  }
}

export default FamilyTournamentParticipationRepo; 