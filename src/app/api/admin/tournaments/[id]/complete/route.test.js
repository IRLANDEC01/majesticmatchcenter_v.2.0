import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers';
import { PATCH } from './route';
import FamilyEarning from '@/models/family/FamilyEarning';
import PlayerEarning from '@/models/player/PlayerEarning';
import FamilyTournamentParticipation from '@/models/family/FamilyTournamentParticipation';

describe('PATCH /api/admin/tournaments/[id]/complete', () => {
  let testData;

  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  beforeEach(async () => {
    await dbClear();
    testData = await populateDb({
      tournaments: [
        {
          scoringType: 'LEADERBOARD',
          tournamentType: 'family',
          status: 'active',
          prizePool: [
            { place: 1, currency: 'MajesticCoins', amount: 1000 },
            { place: 2, currency: 'MajesticCoins', amount: 500 },
          ],
        },
      ],
      maps: (context) => [
        { 
          tournament: context.tournaments[0]._id, 
          status: 'completed',
          name: 'Test Map 1',
          slug: 'test-map-1',
          template: context.mapTemplate1._id,
          startDateTime: new Date('2024-01-01T12:00:00Z'),
        },
        { 
          tournament: context.tournaments[0]._id, 
          status: 'completed',
          name: 'Test Map 2',
          slug: 'test-map-2',
          template: context.mapTemplate2._id,
          startDateTime: new Date('2024-01-01T13:00:00Z'),
        },
      ],
      familyMapParticipations: (context) => {
        const gucciFamily = context.families.find(f => f.name === 'Gucci');
        const uziFamily = context.families.find(f => f.name === 'Uzi');
        const tournamentId = context.tournaments[0]._id;
        return [
          // Map 1: Gucci 3 points, Uzi 1 point. Total: Gucci 3, Uzi 1
          { familyId: gucciFamily._id, mapId: context.maps[0]._id, tournamentId, tournamentPoints: 3, ratingChange: 0, reason: 'test' },
          { familyId: uziFamily._id, mapId: context.maps[0]._id, tournamentId, tournamentPoints: 1, ratingChange: 0, reason: 'test' },
          // Map 2: Gucci 3 points, Uzi 0 points. Total: Gucci 6, Uzi 1
          { familyId: gucciFamily._id, mapId: context.maps[1]._id, tournamentId, tournamentPoints: 3, ratingChange: 0, reason: 'test' },
          { familyId: uziFamily._id, mapId: context.maps[1]._id, tournamentId, tournamentPoints: 0, ratingChange: 0, reason: 'test' },
        ];
      },
      familyTournamentParticipations: (context) => {
        const gucciFamily = context.families.find(f => f.name === 'Gucci');
        const uziFamily = context.families.find(f => f.name === 'Uzi');
        return [
          { familyId: gucciFamily._id, tournamentId: context.tournaments[0]._id },
          { familyId: uziFamily._id, tournamentId: context.tournaments[0]._id },
        ];
      }
    });
  });

  it('should complete a LEADERBOARD tournament, assign prizes, and update stats', async () => {
    // Arrange
    const tournamentToComplete = testData.tournaments[0];
    const gucciFamily = testData.families.find(f => f.name === 'Gucci');
    
    const request = new Request(`http://localhost/api/admin/tournaments/${tournamentToComplete._id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Empty body for LEADERBOARD type
    });

    // Act
    const response = await PATCH(request, { params: { id: tournamentToComplete._id.toString() } });
    const body = await response.json();

    // Assert (Response)
    expect(response.status).toBe(200);
    expect(body.status).toBe('completed');
    expect(body.winner.toString()).toBe(gucciFamily._id.toString());
    expect(body.endDate).not.toBeNull();

    // Assert (Database)
    // 1. Family Earning
    const familyEarning = await FamilyEarning.findOne({ familyId: gucciFamily._id, tournamentId: tournamentToComplete._id });
    expect(familyEarning).not.toBeNull();
    expect(familyEarning.amount).toBe(1000);
    expect(familyEarning.currency).toBe('MajesticCoins');

    // 2. Player Earnings
    const playerEarnings = await PlayerEarning.find({ familyId: gucciFamily._id, tournamentId: tournamentToComplete._id });
    expect(playerEarnings.length).toBe(gucciFamily.members.length);
    expect(playerEarnings[0].amount).toBe(1000 / gucciFamily.members.length);

    // 3. Family Tournament Participation
    const participation = await FamilyTournamentParticipation.findOne({ familyId: gucciFamily._id, tournamentId: tournamentToComplete._id });
    expect(participation.finalPlace).toBe(1);
    
    const earnedPrize = participation.earnings.find(e => e.currency === 'MajesticCoins');
    expect(earnedPrize).toBeDefined();
    expect(earnedPrize.amount).toBe(1000);
  });
});