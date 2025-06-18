import mongoose from 'mongoose';
import { tournamentRepo } from './tournament-repo';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db';
import Tournament from '@/models/tournament/Tournament';
import Player from '@/models/player/Player';
import Map from '@/models/map/Map';
import MapTemplate from '@/models/map/MapTemplate';
import TournamentTemplate from '@/models/tournament/TournamentTemplate';
import PlayerMapParticipation from '@/models/player/PlayerMapParticipation';

describe('TournamentRepo', () => {
  describe('getTournamentStats', () => {
    let tournament;
    let player1, player2, player3;
    let mapTemplate;
    let tournamentTemplate;
    let map1, map2;

    beforeAll(async () => {
      await connectToDatabase();
      await Tournament.init();
      await Player.init();
      await Map.init();
      await MapTemplate.init();
      await TournamentTemplate.init();
      await PlayerMapParticipation.init();
    });

    afterAll(async () => {
      await disconnectFromDatabase();
    });

    beforeEach(async () => {
      await Tournament.deleteMany({});
      await Player.deleteMany({});
      await Map.deleteMany({});
      await MapTemplate.deleteMany({});
      await TournamentTemplate.deleteMany({});
      await PlayerMapParticipation.deleteMany({});

      mapTemplate = await MapTemplate.create({ name: 'Test Map Template', slug: 'test-map-template' });
      
      tournamentTemplate = await TournamentTemplate.create({
        name: 'Test Tournament Template',
        slug: 'test-tournament-template',
        mapTemplates: [mapTemplate._id],
      });

      tournament = await Tournament.create({
        name: 'Stats Test Tournament',
        template: tournamentTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      });

      map1 = await Map.create({
        name: 'Test Map 1',
        slug: 'test-map-1',
        tournament: tournament._id,
        template: mapTemplate._id,
        startDateTime: new Date(),
        status: 'completed',
      });
      map2 = await Map.create({
        name: 'Test Map 2',
        slug: 'test-map-2',
        tournament: tournament._id,
        template: mapTemplate._id,
        startDateTime: new Date(),
        status: 'completed',
      });

      player1 = await Player.create({ firstName: 'Player', lastName: 'One', slug: 'player-one' });
      player2 = await Player.create({ firstName: 'Player', lastName: 'Two', slug: 'player-two' });
      player3 = await Player.create({ firstName: 'Player', lastName: 'Three', slug: 'player-three' });

      await PlayerMapParticipation.create([
        { tournamentId: tournament._id, mapId: map1._id, playerId: player1._id, kills: 10, deaths: 5, damageDealt: 1000, previousRating: 1000, newRating: 1010 },
        { tournamentId: tournament._id, mapId: map2._id, playerId: player1._id, kills: 5, deaths: 5, damageDealt: 500, previousRating: 1010, newRating: 1015 },
        { tournamentId: tournament._id, mapId: map1._id, playerId: player2._id, kills: 20, deaths: 2, damageDealt: 2500, previousRating: 1000, newRating: 1020 },
        { tournamentId: tournament._id, mapId: map1._id, playerId: player3._id, kills: 0, deaths: 0, damageDealt: 100, previousRating: 1000, newRating: 1000 },
      ]);
    });

    it('должен правильно агрегировать и суммировать статистику игроков', async () => {
      const stats = await tournamentRepo.getTournamentStats(tournament._id);

      const player1Stats = stats.find(s => s.playerId.equals(player1._id));
      expect(player1Stats.kills).toBe(15);
      expect(player1Stats.deaths).toBe(10);
      expect(player1Stats.damageDealt).toBe(1500);
      expect(player1Stats.mapsPlayed).toBe(2);
      expect(player1Stats.kd).toBe(1.5);

      const player2Stats = stats.find(s => s.playerId.equals(player2._id));
      expect(player2Stats.kills).toBe(20);
      expect(player2Stats.deaths).toBe(2);
      expect(player2Stats.damageDealt).toBe(2500);
      expect(player2Stats.mapsPlayed).toBe(1);
      expect(player2Stats.kd).toBe(10);
    });

    it('должен правильно обрабатывать деление на ноль для K/D', async () => {
        const stats = await tournamentRepo.getTournamentStats(tournament._id);
        const player3Stats = stats.find(s => s.playerId.equals(player3._id));
        expect(player3Stats.kills).toBe(0);
        expect(player3Stats.deaths).toBe(0);
        expect(player3Stats.kd).toBe(0);
    });

    it('должен правильно сортировать игроков по количеству убийств (убывание)', async () => {
      const stats = await tournamentRepo.getTournamentStats(tournament._id);

      expect(stats.length).toBe(3);
      expect(stats[0].playerId.equals(player2._id)).toBe(true);
      expect(stats[1].playerId.equals(player1._id)).toBe(true);
      expect(stats[2].playerId.equals(player3._id)).toBe(true);
    });

    it('должен возвращать пустой массив для турнира без статистики', async () => {
      const emptyTournamentTemplate = await TournamentTemplate.create({
        name: 'Empty T Template',
        slug: 'empty-t-template',
        mapTemplates: [mapTemplate._id],
      });
      const emptyTournament = await Tournament.create({
        name: 'Empty Stats Test Tournament',
        slug: 'empty-stats-test-tournament',
        template: emptyTournamentTemplate._id,
        tournamentType: 'family',
        startDate: new Date(),
      });
      const stats = await tournamentRepo.getTournamentStats(emptyTournament._id);
      expect(stats).toEqual([]);
    });
  });
}); 