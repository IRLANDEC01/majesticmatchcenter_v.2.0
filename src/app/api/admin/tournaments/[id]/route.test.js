import { GET, PUT, DELETE } from './route';
import { tournamentService } from '@/lib/domain/tournaments/tournament-service.js';

// Мокаем сервисный слой
jest.mock('@/lib/domain/tournaments/tournament-service.js', () => ({
  tournamentService: {
    getTournamentById: jest.fn(),
    updateTournament: jest.fn(),
    archiveTournament: jest.fn(),
  },
}));

describe('API /api/admin/tournaments/[id]', () => {
  // Используем статические ID для предсказуемости
  const testTournamentId = '60c72b2f9b1d8e001f8e4c5e';
  const nonExistentId = '60c72b2f9b1d8e001f8e4c5f';
  const testTournament = { _id: testTournamentId, name: 'Test Tournament Name' };

  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('должен возвращать турнир по ID и статус 200', async () => {
      tournamentService.getTournamentById.mockResolvedValue(testTournament);
      
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournamentId}`);
      const response = await GET(request, { params: { id: testTournamentId } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(testTournament.name);
      expect(tournamentService.getTournamentById).toHaveBeenCalledWith(testTournamentId);
    });

    it('должен возвращать ошибку 404, если турнир не найден', async () => {
      tournamentService.getTournamentById.mockResolvedValue(null);

      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`);
      const response = await GET(request, { params: { id: nonExistentId } });
      
      expect(response.status).toBe(404);
    });

    it('должен возвращать ошибку 500 при ошибке в сервисе', async () => {
        tournamentService.getTournamentById.mockRejectedValue(new Error('Internal Server Error'));
        const request = new Request(`http://localhost/api/admin/tournaments/${testTournamentId}`);
        const response = await GET(request, { params: { id: testTournamentId } });
        expect(response.status).toBe(500);
    });

    it('должен возвращать ошибку 404 при невалидном ID', async () => {
        // Сервис вернет null, а роут должен ответить 404
        tournamentService.getTournamentById.mockResolvedValue(null);
        const invalidId = '123';
        const request = new Request(`http://localhost/api/admin/tournaments/${invalidId}`);
        const response = await GET(request, { params: { id: invalidId } });
        expect(response.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('должен успешно обновлять турнир и возвращать статус 200', async () => {
      const updatedData = { name: 'Updated Tournament Name' };
      const updatedTournament = { ...testTournament, ...updatedData };
      tournamentService.updateTournament.mockResolvedValue(updatedTournament);

      const request = new Request(`http://localhost/api/admin/tournaments/${testTournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const response = await PUT(request, { params: { id: testTournamentId } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe(updatedData.name);
      expect(tournamentService.updateTournament).toHaveBeenCalledWith(testTournamentId, updatedData);
    });

    it('должен возвращать 404, если турнир для обновления не найден', async () => {
      tournamentService.updateTournament.mockResolvedValue(null);
      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Does not matter' }),
      });

      const response = await PUT(request, { params: { id: nonExistentId } });
      expect(response.status).toBe(404);
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      const invalidData = { name: '' }; // Пустое имя невалидно по схеме
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await PUT(request, { params: { id: testTournamentId } });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('должен успешно архивировать турнир и возвращать статус 204', async () => {
      tournamentService.archiveTournament.mockResolvedValue({ ...testTournament, archivedAt: new Date() });
      
      const request = new Request(`http://localhost/api/admin/tournaments/${testTournamentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: testTournamentId } });

      expect(response.status).toBe(204);
      expect(tournamentService.archiveTournament).toHaveBeenCalledWith(testTournamentId);
    });

    it('должен возвращать 404, если турнир для архивации не найден', async () => {
      tournamentService.archiveTournament.mockResolvedValue(null);

      const request = new Request(`http://localhost/api/admin/tournaments/${nonExistentId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: nonExistentId } });
      expect(response.status).toBe(404);
    });
  });
}); 