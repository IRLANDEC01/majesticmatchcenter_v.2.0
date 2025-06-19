import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service';
import FamilyEarning from '@/models/family/FamilyEarning';
import PlayerEarning from '@/models/player/PlayerEarning';
import FamilyTournamentParticipation from '@/models/family/FamilyTournamentParticipation';
import PlayerTournamentParticipation from '@/models/player/PlayerTournamentParticipation';
import Tournament from '@/models/tournament/Tournament';
import { RESULT_TIERS, CURRENCY_TYPES, STATUSES } from '@/lib/constants';

describe('TournamentService.completeTournament', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb({
      numFamilies: 2,
      numPlayers: 2,
      tournaments: [{
        prizePool: [
          { target: { tier: RESULT_TIERS.WINNER, rank: 1 }, amount: 1000, currency: CURRENCY_TYPES.MAJESTIC_COINS },
          { target: { tier: RESULT_TIERS.RUNNER_UP, rank: 2 }, amount: 500, currency: CURRENCY_TYPES.MAJESTIC_COINS },
          { target: { tier: RESULT_TIERS.SEMI_FINALIST }, amount: 100000, currency: CURRENCY_TYPES.GTA_DOLLARS },
        ],
      }],
    });
    testData = data;
  });

  it('должен корректно завершать турнир, начислять призы по рангам и тирам', async () => {
    // Arrange
    const tournamentToComplete = testData.tournament;
    const { familyGucci, familyUzi } = testData;

    const outcomes = [
      { familyId: familyUzi._id, tier: RESULT_TIERS.RUNNER_UP, rank: 2 },
      { familyId: familyGucci._id, tier: RESULT_TIERS.WINNER, rank: 1 },
    ];

    // Act
    await tournamentService.completeTournament(tournamentToComplete._id, { outcomes });

    // Assert
    // 1. Проверка самого турнира
    const completedTournament = await Tournament.findById(tournamentToComplete._id);
    expect(completedTournament.status).toBe(STATUSES.COMPLETED);
    expect(completedTournament.winner.toString()).toBe(familyGucci._id.toString());
    expect(completedTournament.endDate).toBeDefined();

    // 2. Проверка призовых для семьи-победителя (Gucci)
    const gucciEarning = await FamilyEarning.findOne({ familyId: familyGucci._id, tournamentId: tournamentToComplete._id });
    expect(gucciEarning).toBeDefined();
    expect(gucciEarning.amount).toBe(1000);
    expect(gucciEarning.currency).toBe(CURRENCY_TYPES.MAJESTIC_COINS);
    expect(gucciEarning.rank).toBe(1);

    // 3. Проверка призовых для игрока семьи-победителя
    const gucciPlayer = testData.playerGucci;
    const gucciPlayerEarning = await PlayerEarning.findOne({ playerId: gucciPlayer._id, tournamentId: tournamentToComplete._id });
    expect(gucciPlayerEarning).toBeDefined();
    expect(gucciPlayerEarning.amount).toBe(1000);

    // 4. Проверка записи об участии семьи (Gucci)
    const gucciParticipation = await FamilyTournamentParticipation.findOne({ familyId: familyGucci._id, tournamentId: tournamentToComplete._id });
    expect(gucciParticipation.result.tier).toBe(RESULT_TIERS.WINNER);
    expect(gucciParticipation.result.rank).toBe(1);
    expect(gucciParticipation.earnings.length).toBe(1);
    expect(gucciParticipation.earnings[0].amount).toBe(1000);

    // 5. Проверка записи об участии игрока (Gucci)
    const gucciPlayerParticipation = await PlayerTournamentParticipation.findOne({ playerId: gucciPlayer._id, tournamentId: tournamentToComplete._id });
    expect(gucciPlayerParticipation.earnings.length).toBe(1);
    expect(gucciPlayerParticipation.earnings[0].amount).toBe(1000);
  });
});