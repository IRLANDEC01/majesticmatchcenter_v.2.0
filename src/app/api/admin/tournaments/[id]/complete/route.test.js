import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service';
import FamilyEarning from '@/models/family/FamilyEarning';
import PlayerEarning from '@/models/player/PlayerEarning';
import FamilyTournamentParticipation from '@/models/family/FamilyTournamentParticipation';
import PlayerTournamentParticipation from '@/models/player/PlayerTournamentParticipation';
import Tournament from '@/models/tournament/Tournament';
import { RESULT_TIERS } from '@/lib/constants';

describe('TournamentService.completeTournament', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb({
      tournaments: [{
        prizePool: [
          { target: { rank: 1 }, currency: 'MajesticCoins', amount: 1000 },
          { target: { rank: 2 }, currency: 'MajesticCoins', amount: 500 },
          { target: { tier: 'semi-finalist' }, currency: 'GTADollars', amount: 100000 },
        ],
      }],
      familyTournamentParticipations: (context) => [
        { family: context.families[0]._id, tournament: context.tournaments[0]._id },
        { family: context.families[1]._id, tournament: context.tournaments[0]._id },
      ],
      playerTournamentParticipations: (context) => [
        ...context.players.map(p => ({ playerId: p._id, tournamentId: context.tournaments[0]._id }))
      ],
    });
  });

  it.skip('должен корректно завершать турнир, начислять призы по рангам и тирам', async () => {
    // Arrange
    const tournamentToComplete = testData.tournaments[0];
    const gucciFamily = testData.families.find(f => f.name === 'Gucci'); // 1 member
    const uziFamily = testData.families.find(f => f.name === 'Uzi'); // 1 member

    const outcomes = [
      { familyId: uziFamily._id, tier: RESULT_TIERS.RUNNER_UP, rank: 2 },
      { familyId: gucciFamily._id, tier: RESULT_TIERS.WINNER, rank: 1 },
    ];

    // Act
    await tournamentService.completeTournament(tournamentToComplete._id, { outcomes });

    // Assert
    // 1. Проверка самого турнира
    const completedTournament = await Tournament.findById(tournamentToComplete._id);
    expect(completedTournament.status).toBe('COMPLETED');
    expect(completedTournament.winner.toString()).toBe(gucciFamily._id.toString());
    expect(completedTournament.endDate).toBeDefined();

    // 2. Проверка призовых для семьи-победителя (Gucci)
    const gucciEarning = await FamilyEarning.findOne({ familyId: gucciFamily._id, tournamentId: tournamentToComplete._id });
    expect(gucciEarning).toBeDefined();
    expect(gucciEarning.amount).toBe(1000);
    expect(gucciEarning.rank).toBe(1);

    // 3. Проверка призовых для игрока семьи-победителя
    const gucciPlayerEarning = await PlayerEarning.findOne({ familyId: gucciFamily._id, tournamentId: tournamentToComplete._id });
    expect(gucciPlayerEarning).toBeDefined();
    expect(gucciPlayerEarning.amount).toBe(1000); // т.к. 1 игрок в семье

    // 4. Проверка записи об участии семьи (Gucci)
    const gucciParticipation = await FamilyTournamentParticipation.findOne({ familyId: gucciFamily._id, tournamentId: tournamentToComplete._id });
    expect(gucciParticipation.result.tier).toBe(RESULT_TIERS.WINNER);
    expect(gucciParticipation.result.rank).toBe(1);
    expect(gucciParticipation.earnings.length).toBe(1);
    expect(gucciParticipation.earnings[0].amount).toBe(1000);

    // 5. Проверка записи об участии игрока (Gucci)
    const gucciPlayerId = gucciFamily.members[0].player;
    const gucciPlayerParticipation = await PlayerTournamentParticipation.findOne({ playerId: gucciPlayerId, tournamentId: tournamentToComplete._id });
    expect(gucciPlayerParticipation.earnings.length).toBe(1);
    expect(gucciPlayerParticipation.earnings[0].amount).toBe(1000);
  });
});