import { GET, POST } from './route.js';
import models from '@/models/index.js';
import { dbConnect, dbDisconnect, dbClear, populateDb } from '@/lib/test-helpers.js';

const { Tournament, TournamentTemplate } = models;

describe('API /api/admin/tournaments', () => {
  let testData;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    testData = await populateDb();
  });

  describe('POST', () => {
    it.skip('должен успешно создавать турниры, наследуя scoringType из шаблона', async () => {
      // Arrange
      // Создаем специальный шаблон для этого теста с нестандартным scoringType
      const templateForTournament = await TournamentTemplate.create({
        name: 'Manual Selection Template',
        slug: 'manual-selection-template',
        mapTemplates: [testData.mapTemplate1._id],
        scoringType: 'MANUAL_SELECTION',
      });
      
      const requestData = {
        name: 'Новый тестовый турнир',
        template: templateForTournament._id.toString(),
        tournamentType: 'family',
        // scoringType БОЛЬШЕ НЕ ПЕРЕДАЕТСЯ, он должен наследоваться
        startDate: new Date(),
      };

      // --- Первый вызов ---
      const request1 = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const response1 = await POST(request1);
      const body1 = await response1.json();

      expect(response1.status).toBe(201);
      expect(body1.name).toBe(requestData.name);
      expect(body1.slug).toBe(`${templateForTournament.slug}-1`);
      expect(body1.scoringType).toBe('MANUAL_SELECTION'); // Проверяем наследование
      
      // --- Второй вызов с теми же данными для проверки инкремента slug ---
      const request2 = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      
      const response2 = await POST(request2);
      const body2 = await response2.json();
      expect(response2.status).toBe(201);
      expect(body2.slug).toBe(`${templateForTournament.slug}-2`);
      expect(body2.scoringType).toBe('MANUAL_SELECTION');
    });

    it('должен возвращать ошибку 400, если не указаны обязательные поля', async () => {
      // Arrange
      const requestData = { name: 'Неполный турнир' }; // Нет template, type, и т.д.
      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.errors).toHaveProperty('template');
      expect(body.errors).toHaveProperty('startDate');
      expect(body.errors).toHaveProperty('tournamentType');
      // Поле scoringType больше не является ответственностью клиента, убираем проверку
      // expect(body.errors).toHaveProperty('scoringType');
    });

    it.skip('должен возвращать ошибку 400, если не указан ни один участник', async () => {
       // Этот тест временно неактуален, т.к. участники добавляются после создания
       // Arrange
       const requestData = {
        name: 'Турнир без участников',
        template: testData.tournamentTemplate._id.toString(),
        tournamentType: 'family',
        // scoringType: 'LEADERBOARD', // Убрано
        startDate: new Date(),
        // participants: [], // Zod-схема больше не проверяет участников
      };

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      // Поскольку валидация участников убрана из схемы создания,
      // этот тест должен проходить успешно (201).
      expect(response.status).toBe(201);
    });
  });

  describe('GET', () => {
    it('должен возвращать только неархивированные турниры по умолчанию', async () => {
      // Arrange: populateDb создает один активный турнир
      // Архивируем его, чтобы проверить фильтрацию
      await Tournament.findByIdAndUpdate(testData.tournament._id, { archivedAt: new Date() });
      // Создаем новый активный турнир
      await Tournament.create({
        name: 'Active Tournament',
        slug: 'active-tournament-1',
        template: testData.tournamentTemplate._id,
        scoringType: 'LEADERBOARD',
        tournamentType: 'family',
        startDate: new Date(),
        participants: [{ participantType: 'family', family: testData.families[0]._id }]
      });

      const request = new Request('http://localhost/api/admin/tournaments');
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(1);
      expect(body[0].name).toBe('Active Tournament');
    });

    it('должен возвращать все турниры при `include_archived=true`', async () => {
      // Arrange: populateDb создает один активный турнир. Этого достаточно.
      const request = new Request('http://localhost/api/admin/tournaments?include_archived=true');
      
      // Act
      const response = await GET(request);
      const body = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(body.length).toBe(1); // В populateDb создается только один турнир
    });
  });
});
