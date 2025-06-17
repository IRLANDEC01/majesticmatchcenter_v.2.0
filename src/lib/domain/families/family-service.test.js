import { FamilyService } from './family-service.js';

// Создаем полный мок репозитория
const mockFamilyRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deactivate: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FamilyService', () => {
  const service = new FamilyService(mockFamilyRepository);

  it('createFamily должен вызывать repo.create', async () => {
    const familyData = { name: 'Test Family' };
    mockFamilyRepository.create.mockResolvedValue(familyData);
    await service.createFamily(familyData);
    expect(mockFamilyRepository.create).toHaveBeenCalledWith(familyData);
  });

  it('getAllFamilies должен вызывать repo.findAll', async () => {
    mockFamilyRepository.findAll.mockResolvedValue([]);
    await service.getAllFamilies();
    expect(mockFamilyRepository.findAll).toHaveBeenCalled();
  });

  it('getFamilyById должен вызывать repo.findById', async () => {
    const id = 'family-id';
    mockFamilyRepository.findById.mockResolvedValue({});
    await service.getFamilyById(id);
    expect(mockFamilyRepository.findById).toHaveBeenCalledWith(id);
  });

  it('updateFamily должен вызывать repo.update', async () => {
    const id = 'family-id';
    const familyData = { description: 'new description' };
    mockFamilyRepository.update.mockResolvedValue({});
    await service.updateFamily(id, familyData);
    expect(mockFamilyRepository.update).toHaveBeenCalledWith(id, familyData);
  });

  it('addMember должен вызывать repo.update с оператором $push', async () => {
    const familyId = 'family-id';
    const playerId = 'player-id';
    const role = 'leader';
    const expectedUpdate = { $push: { members: { player: playerId, role } } };

    await service.addMember(familyId, playerId, role);
    expect(mockFamilyRepository.update).toHaveBeenCalledWith(familyId, expectedUpdate);
  });

  it('removeMember должен вызывать repo.update с оператором $pull', async () => {
    const familyId = 'family-id';
    const playerId = 'player-id';
    const expectedUpdate = { $pull: { members: { player: playerId } } };

    await service.removeMember(familyId, playerId);
    expect(mockFamilyRepository.update).toHaveBeenCalledWith(familyId, expectedUpdate);
  });

  it('deactivateFamily должен вызывать repo.deactivate', async () => {
    const familyId = 'family-id-to-deactivate';
    mockFamilyRepository.deactivate.mockResolvedValue({ _id: familyId, status: 'inactive' });
    
    await service.deactivateFamily(familyId);
    
    expect(mockFamilyRepository.deactivate).toHaveBeenCalledWith(familyId);
  });
}); 