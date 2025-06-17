import { TournamentService } from './tournament-service.js';
import { tournamentRepository } from '@/lib/repos/tournaments/tournament-repo.js';
import { tournamentTemplateRepository } from '@/lib/repos/tournament-templates/tournament-template-repo.js';

// Мокаем оба репозитория
jest.mock('@/lib/repos/tournaments/tournament-repo.js', () => ({
  tournamentRepository: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    archiveById: jest.fn(),
    restoreById: jest.fn(),
    getTournamentStats: jest.fn(),
  },
}));

jest.mock('@/lib/repos/tournament-templates/tournament-template-repo.js', () => ({
    tournamentTemplateRepository: {
        incrementUsageCount: jest.fn(),
    }
}));

describe('TournamentService', () => {
  const service = new TournamentService(tournamentRepository, tournamentTemplateRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createTournament должен вызывать repo.create', async () => {
    const data = { name: 'New Tournament', template: 'template-id' };
    // Мокаем возвращаемое значение для templateRepo, чтобы избежать ошибки
    tournamentTemplateRepository.incrementUsageCount.mockResolvedValue({ slug: 'test-slug', usageCount: 1 });
    await service.createTournament(data);
    expect(tournamentRepository.create).toHaveBeenCalled();
  });
  
  it('getTournaments должен вызывать repo.findAll', async () => {
    const options = { includeArchived: true };
    await service.getTournaments(options);
    expect(tournamentRepository.findAll).toHaveBeenCalledWith(options);
  });
  
  it('getTournamentById должен вызывать repo.findById', async () => {
    const id = 'tournament-id';
    await service.getTournamentById(id);
    expect(tournamentRepository.findById).toHaveBeenCalledWith(id, undefined); // Pass undefined for options
  });

  it('updateTournament должен вызывать repo.update', async () => {
    const id = 'tournament-id';
    const data = { description: 'new description' };
    await service.updateTournament(id, data);
    expect(tournamentRepository.update).toHaveBeenCalledWith(id, data);
  });

  it('archiveTournament должен вызывать repo.archiveById', async () => {
    const id = 'tournament-to-archive';
    await service.archiveTournament(id);
    expect(tournamentRepository.archiveById).toHaveBeenCalledWith(id);
  });

  it('restoreTournament должен вызывать repo.restoreById', async () => {
    const id = 'tournament-to-restore';
    await service.restoreTournament(id);
    expect(tournamentRepository.restoreById).toHaveBeenCalledWith(id);
  });

  it('getStats должен вызывать repo.getTournamentStats', async () => {
    const id = 'tournament-with-stats';
    await service.getStats(id);
    expect(tournamentRepository.getTournamentStats).toHaveBeenCalledWith(id);
  });
}); 