import { PlayerService } from './player-service.js';

// Создаем полный мок репозитория
const mockPlayerRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
  ban: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PlayerService', () => {
  const service = new PlayerService(mockPlayerRepository);

  it('createPlayer должен вызывать repo.create', async () => {
    const playerData = { firstName: 'Test', lastName: 'Player' };
    mockPlayerRepository.create.mockResolvedValue(playerData);
    
    await service.createPlayer(playerData);
    
    expect(mockPlayerRepository.create).toHaveBeenCalledWith(playerData);
  });

  it('getAllPlayers должен вызывать repo.findAll с опциями', async () => {
    mockPlayerRepository.findAll.mockResolvedValue([]);
    const options = { includeInactive: true };
    await service.getAllPlayers(options);
    expect(mockPlayerRepository.findAll).toHaveBeenCalledWith(options);
  });

  it('getPlayerById должен вызывать repo.findById', async () => {
    const id = 'some-id';
    mockPlayerRepository.findById.mockResolvedValue({});
    await service.getPlayerById(id);
    expect(mockPlayerRepository.findById).toHaveBeenCalledWith(id);
  });

  it('getPlayerBySlug должен вызывать repo.findBySlug', async () => {
    const slug = 'some-slug';
    mockPlayerRepository.findBySlug.mockResolvedValue({});
    await service.getPlayerBySlug(slug);
    expect(mockPlayerRepository.findBySlug).toHaveBeenCalledWith(slug);
  });

  it('updatePlayer должен вызывать repo.update', async () => {
    const id = 'some-id';
    const playerData = { bio: 'new bio' };
    mockPlayerRepository.update.mockResolvedValue({});
    await service.updatePlayer(id, playerData);
    expect(mockPlayerRepository.update).toHaveBeenCalledWith(id, playerData);
  });

  it('deactivatePlayer должен вызывать repo.deactivate', async () => {
    const id = 'player-to-deactivate';
    mockPlayerRepository.deactivate.mockResolvedValue({ _id: id, status: 'inactive' });
    await service.deactivatePlayer(id);
    expect(mockPlayerRepository.deactivate).toHaveBeenCalledWith(id);
  });
}); 