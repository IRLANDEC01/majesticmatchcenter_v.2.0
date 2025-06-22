import { GET, POST } from './route.js';
import { dbConnect, dbDisconnect, dbClear } from '@/lib/test-helpers.js';
import TournamentTemplate from '@/models/tournament/TournamentTemplate.js';
import MapTemplate from '@/models/map/MapTemplate.js';
import { RESULT_TIERS, CURRENCY_TYPES } from '@/lib/constants.js';
import { revalidatePath } from 'next/cache';

// Мокируем внешние зависимости. Сервисы и репозитории НЕ мокируем!
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('API /api/admin/tournament-templates', () => {
  let mapTemplate;

  beforeAll(dbConnect);
  afterAll(dbDisconnect);
  beforeEach(async () => {
    await dbClear();
    revalidatePath.mockClear();
    // Создаем общую для всех тестов сущность, от которой есть зависимость
    mapTemplate = await MapTemplate.create({ name: 'Test Map' });
  });

  describe('POST', () => {
    it('должен успешно создавать шаблон, вызывать revalidatePath и возвращать 201', async () => {
      // Arrange
      const templateData = {
        name: 'New Unique Tournament Template',
        mapTemplates: [mapTemplate._id.toString()],
        description: 'A test description',
        rules: 'A test ruleset',
        prizePool: [{
          target: { tier: RESULT_TIERS.WINNER, rank: 1 },
          currency: CURRENCY_TYPES.GTA_DOLLARS,
          amount: 100,
        }],
      };
      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.name).toBe(templateData.name);
      
      const dbTemplate = await TournamentTemplate.findById(body._id).lean();
      expect(dbTemplate).not.toBeNull();
      expect(dbTemplate.prizePool[0].target.tier).toBe(RESULT_TIERS.WINNER);
      expect(dbTemplate.prizePool[0].amount).toBe(100);

      expect(revalidatePath).toHaveBeenCalledWith('/admin/tournament-templates');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it('должен возвращать 409 при попытке создать дубликат по имени', async () => {
      // Arrange
      await TournamentTemplate.create({ name: 'Existing Template', mapTemplates: [mapTemplate._id] });
      const templateData = { 
        name: 'Existing Template', // Используем то же имя
        mapTemplates: [mapTemplate._id.toString()],
      };

      const request = new Request('http://localhost/api/admin/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      // Act
      const response = await POST(request);
      
      // Assert
      expect(response.status).toBe(409);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('должен возвращать только активные шаблоны по умолчанию', async () => {
      // Arrange
      await TournamentTemplate.create({ 
        name: 'Active Template', 
        mapTemplates: [mapTemplate._id],
      });
      await TournamentTemplate.create({ 
        name: 'Archived Template', 
        mapTemplates: [mapTemplate._id],
        archivedAt: new Date(),
      });

      const request = new Request('http://localhost/api/admin/tournament-templates');
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe('Active Template');
    });

    it('должен возвращать только архивные шаблоны при `status=archived`', async () => {
      // Arrange
      await TournamentTemplate.create({ 
        name: 'Active Template', 
        mapTemplates: [mapTemplate._id],
      });
      const archivedTemplate = await TournamentTemplate.create({ 
        name: 'Archived Template', 
        mapTemplates: [mapTemplate._id],
        archivedAt: new Date(),
      });

      const url = new URL('http://localhost/api/admin/tournament-templates');
      url.searchParams.set('status', 'archived');
      const request = new Request(url);
      
      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.total).toBe(1);
      expect(body.data[0].name).toBe(archivedTemplate.name);
    });
  });
}); 