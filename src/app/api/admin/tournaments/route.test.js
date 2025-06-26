import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { populateDb, dbClear } from '@/lib/test-helpers.js';
import { CURRENCY_TYPES, RESULT_TIERS, STATUSES } from '@/lib/constants.js';
import tournamentRepo from '@/lib/repos/tournaments/tournament-repo';
import { Types } from 'mongoose';
import { vi } from 'vitest';

const { Tournament, TournamentTemplate } = models;

vi.mock('@/lib/repos/tournaments/tournament-repo');

describe('API /api/admin/tournaments', () => {
  let testData;

  beforeEach(async () => {
    await dbClear();
    const { testData: data } = await populateDb({
      numFamilies: 2,
      numPlayers: 2,
      numTournamentTemplates: 1,
      tournaments: [{
        name: 'Default Test Tournament',
        slug: 'default-test-tournament',
      }],
    });
    testData = data;
  });

  describe('POST', () => {
    it('должен успешно создавать турнир, наследуя prizePool из шаблона', async () => {
      const requestData = {
        name: 'Новый тестовый турнир',
        template: testData.tournamentTemplate._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
      };

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe(requestData.name);
      
      const createdTournament = await Tournament.findById(body._id);
      
      // Проверяем, что prizePool был унаследован из шаблона
      expect(createdTournament.prizePool).toBeDefined();
      expect(createdTournament.prizePool.length).toBe(1);
      expect(createdTournament.prizePool[0].target.tier).toBe(RESULT_TIERS.WINNER);
      expect(createdTournament.prizePool[0].currency).toBe(CURRENCY_TYPES.GTA_DOLLARS);
      expect(createdTournament.prizePool[0].amount).toBe(1000000);
    });

    it('должен возвращать ошибку 400, если не указано обязательное поле name', async () => {
      const requestData = {
        template: testData.tournamentTemplate._id.toString(),
        tournamentType: 'family',
        startDate: new Date(),
      };
      
      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors).toHaveProperty('name');
    });

    it('должен возвращать 400, если tournamentTemplateId не указан', async () => {
        const newTournament = {
            name: 'Tournament Without Template',
        };

        const request = new Request('http://localhost/api/admin/tournaments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTournament),
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errors).toHaveProperty('template');
    });

    it('должен успешно создавать турнир, даже если в запросе передан пустой prizePool', async () => {
       const requestData = {
            name: 'Турнир с пустым призовым фондом',
            template: testData.tournamentTemplate._id.toString(),
            prizePool: [],
            tournamentType: 'family',
            startDate: new Date(),
      };

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
        expect(response.status).toBe(201);
        
      const body = await response.json();
        const createdTournament = await Tournament.findById(body._id);
        
        // prizePool должен наследоваться от шаблона, даже если передан пустой
        expect(createdTournament.prizePool.length).toBeGreaterThan(0);
        expect(createdTournament.prizePool[0].target.tier).toBe(RESULT_TIERS.WINNER);
    });

    it('должен переопределять prizePool, если он передан в запросе', async () => {
        const newPrizePool = [
            {
                target: { tier: RESULT_TIERS.RUNNER_UP, rank: 2 },
                amount: 500,
                currency: CURRENCY_TYPES.MAJESTIC_COINS,
            },
        ];
        
        const requestData = {
            name: 'Турнир с кастомным призовым фондом',
            template: testData.tournamentTemplate._id.toString(),
            prizePool: newPrizePool,
            tournamentType: 'family',
            startDate: new Date(),
        };

        const request = new Request('http://localhost/api/admin/tournaments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
        });

        const response = await POST(request);
      expect(response.status).toBe(201);
        
        const body = await response.json();
        const createdTournament = await Tournament.findById(body._id);

        expect(createdTournament.prizePool.length).toBe(1);
        expect(createdTournament.prizePool[0].target.tier).toBe(RESULT_TIERS.RUNNER_UP);
        expect(createdTournament.prizePool[0].currency).toBe(CURRENCY_TYPES.MAJESTIC_COINS);
        expect(createdTournament.prizePool[0].amount).toBe(500);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные турниры по умолчанию', async () => {
      // В beforeEach создается один турнир через populateDb, он не должен быть архивным
      const request = new Request('http://localhost/api/admin/tournaments');
      
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      // В beforeEach создается один турнир через populateDb
      expect(body.length).toBe(1);
      expect(body[0].archivedAt).toBeUndefined();
    });

    it('должен возвращать все турниры при `include_archived=true`', async () => {
      // Создаем все необходимые данные прямо здесь, чтобы тест был независимым
      await dbClear(); // Очищаем базу перед тестом
      const { testData: data } = await populateDb({ numTournamentTemplates: 1 });

      // 1. Создаем активный турнир
      await Tournament.create({
        name: 'Active Tournament',
        slug: 'active-tournament',
        template: data.tournamentTemplate._id,
        tournamentType: 'family',
        status: STATUSES.ACTIVE,
        startDate: new Date(),
      });
      // 2. Создаем архивный турнир
      await Tournament.create({
        name: 'Archived Tournament',
        slug: 'archived-tournament',
        template: data.tournamentTemplate._id,
        tournamentType: 'family',
        status: STATUSES.COMPLETED,
        startDate: new Date(),
        archivedAt: new Date(),
      });

      const request = new Request('http://localhost/api/admin/tournaments?include_archived=true');
      
      const response = await GET(request);
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.length).toBe(2); // Один из populateDb, один созданный архивный
    });
  });
});
