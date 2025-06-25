import mongoose from 'mongoose';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers';
import { LIFECYCLE_STATUSES as STATUSES } from '@/lib/constants';
import tournamentRepo from './tournament-repo';
import { Tournament, Player, Family, Map, MapTemplate } from '@/models';

describe('TournamentRepository', () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  beforeEach(async () => {
    await dbClear();
  });

  describe('getFullTournamentDetails', () => {
    it('должен возвращать null, если турнир не найден', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const tournament = await tournamentRepo.getFullTournamentDetails(nonExistentId);
      expect(tournament).toBeNull();
    });

    it('должен возвращать полные данные турнира со статистикой участников', async () => {
      // Arrange
      const { testData } = await populateDb({
        numFamilies: 2,
        numPlayers: 2,
        numTournaments: 1,
        maps: [{}, {}],
        familyMapParticipations: (ctx) => [{
          family: ctx.families[0]._id,
          map: ctx.maps[0]._id,
          tournament: ctx.tournament._id,
          totalKills: 18,
          totalDeaths: 7,
        }],
      });

      // Act
      const tournament = await tournamentRepo.getFullTournamentDetails(testData.tournament._id);

      // Assert
      expect(tournament).not.toBeNull();
      expect(tournament.participants).toHaveLength(2);
      const participant = tournament.participants.find(p => p.family._id.equals(testData.families[0]._id));
      expect(participant).toBeDefined();
      expect(participant.stats.totalKills).toBe(18);
      expect(participant.stats.totalDeaths).toBe(7);
    });
  });

  describe('findActiveTournamentsWithUpcomingMaps', () => {
    it('должен находить только активные турниры с предстоящими картами', async () => {
      // Arrange
      const { testData: data1 } = await populateDb({
        tournaments: [{ status: STATUSES.ACTIVE }],
        maps: [{ startDateTime: new Date(Date.now() + 86400000) }], // Завтра
      });

      await populateDb({
        tournaments: [{ name: 'Old Cup', slug: 'old-cup', status: STATUSES.COMPLETED }],
      });

      await populateDb({
        tournaments: [{ name: 'Active Cup No Maps', slug: 'active-cup-no-maps', status: STATUSES.ACTIVE }],
        maps: null,
      });

      await populateDb({
        tournaments: [{ name: 'Active Cup Past Maps', slug: 'active-cup-past-maps', status: STATUSES.ACTIVE }],
        maps: [{ startDateTime: new Date(Date.now() - 86400000) }], // Вчера
      });

      // Act
      const activeTournaments = await tournamentRepo.findActiveTournamentsWithUpcomingMaps();

      // Assert
      expect(activeTournaments).toHaveLength(1);
      expect(activeTournaments[0]._id.equals(data1.tournament._id)).toBe(true);
      expect(activeTournaments[0].upcomingMaps).toHaveLength(1);
    });
  });

  describe('getTournamentStats', () => {
    it('должен правильно агрегировать и сортировать статистику игроков', async () => {
      // Arrange
      const { testData } = await populateDb({
        numPlayers: 3,
        maps: [{}, {}],
        playerMapParticipations: (ctx) => [
          { tournament: ctx.tournament._id, map: ctx.maps[0]._id, player: ctx.players[0]._id, kills: 10, deaths: 5 },
          { tournament: ctx.tournament._id, map: ctx.maps[1]._id, player: ctx.players[0]._id, kills: 5, deaths: 5 },
          { tournament: ctx.tournament._id, map: ctx.maps[0]._id, player: ctx.players[1]._id, kills: 20, deaths: 2 },
          { tournament: ctx.tournament._id, map: ctx.maps[0]._id, player: ctx.players[2]._id, kills: 0, deaths: 0 },
        ],
      });

      // Act
      const stats = await tournamentRepo.getTournamentStats(testData.tournament._id);

      // Assert
      expect(stats.map(s => s.kills)).toEqual([20, 15, 0]);
      expect(stats[0].playerId.equals(testData.players[1]._id)).toBe(true);

      const player1Stats = stats.find(s => s.playerId.equals(testData.players[0]._id));
      expect(player1Stats.kills).toBe(15);
      expect(player1Stats.deaths).toBe(10);
      expect(player1Stats.kd).toBe(1.5);

      const player2Stats = stats.find(s => s.playerId.equals(testData.players[1]._id));
      expect(player2Stats.kd).toBe(10); // 20 / 2

      const player3Stats = stats.find(s => s.playerId.equals(testData.players[2]._id));
      expect(player3Stats.kd).toBe(0); // 0 / 0
    });

    it('должен возвращать пустой массив для турнира без статистики', async () => {
      const { testData } = await populateDb({ maps: null });
      const stats = await tournamentRepo.getTournamentStats(testData.tournament._id);
      expect(stats).toEqual([]);
    });
  });
}); 