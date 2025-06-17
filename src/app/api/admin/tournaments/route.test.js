import { POST, GET } from './route';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service.js';

// Мокаем сервисный слой
jest.mock('@/lib/domain/tournaments/tournament-service.js', () => ({
  tournamentService: {
    createTournament: jest.fn(),
    getTournaments: jest.fn(),
  },
}));

describe('API /api/admin/tournaments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('должен успешно создавать турнир и возвращать статус 201', async () => {
      const tournamentData = {
        name: 'Majestic Champions League',
        description: 'The main event of the year.',
        template: '60c72b2f9b1d8e001f8e4c5e', // Валидный ObjectId
        tournamentType: 'family',
        startDate: new Date().toISOString(),
      };
      const createdTournament = { _id: 'new-id', ...tournamentData };
      tournamentService.createTournament.mockResolvedValue(createdTournament);

      const request = new Request('http://localhost/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(createdTournament);
      expect(tournamentService.createTournament).toHaveBeenCalledWith(expect.objectContaining({
        name: tournamentData.name,
      }));
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
        const invalidData = { name: 't' }; // Невалидные данные
        const request = new Request('http://localhost/api/admin/tournaments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        expect(tournamentService.createTournament).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('должен возвращать список турниров', async () => {
      const tournaments = [{ name: 'Tournament 1' }, { name: 'Tournament 2' }];
      tournamentService.getTournaments.mockResolvedValue(tournaments);

      const request = new Request('http://localhost/api/admin/tournaments', { method: 'GET' });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(tournaments);
      expect(tournamentService.getTournaments).toHaveBeenCalledWith({ includeArchived: false });
    });

    it('должен вызывать getTournaments с includeArchived: true', async () => {
      tournamentService.getTournaments.mockResolvedValue([]);
      
      const request = new Request('http://localhost/api/admin/tournaments?include_archived=true', { method: 'GET' });
      await GET(request);

      expect(tournamentService.getTournaments).toHaveBeenCalledWith({ includeArchived: true });
    });
  });
});
