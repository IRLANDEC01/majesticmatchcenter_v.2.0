import { MapTemplateService } from './map-template-service.js';

const mockMapTemplateRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MapTemplateService', () => {
  const service = new MapTemplateService(mockMapTemplateRepository);

  describe('createTemplate', () => {
    it('должен вызывать метод create репозитория с правильными данными', async () => {
      const templateData = { name: 'New Map', slug: 'new-map' };
      const expectedResult = { _id: 'map-id-1', ...templateData };
      mockMapTemplateRepository.create.mockResolvedValue(expectedResult);

      const result = await service.createTemplate(templateData);

      expect(mockMapTemplateRepository.create).toHaveBeenCalledTimes(1);
      expect(mockMapTemplateRepository.create).toHaveBeenCalledWith(templateData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllTemplates', () => {
    it('должен вызывать метод findAll репозитория', async () => {
      const expectedTemplates = [{ name: 'Map 1' }, { name: 'Map 2' }];
      mockMapTemplateRepository.findAll.mockResolvedValue(expectedTemplates);

      const result = await service.getAllTemplates();

      expect(mockMapTemplateRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedTemplates);
    });
  });

  describe('getTemplateById', () => {
    it('должен вызывать метод findById репозитория с правильным ID', async () => {
      const templateId = 'map-123';
      const expectedTemplate = { _id: templateId, name: 'Found Map' };
      mockMapTemplateRepository.findById.mockResolvedValue(expectedTemplate);

      const result = await service.getTemplateById(templateId);

      expect(mockMapTemplateRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockMapTemplateRepository.findById).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(expectedTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('должен вызывать метод update репозитория с правильными данными', async () => {
      const templateId = 'map-to-update';
      const updateData = { description: 'New description' };
      const expectedResult = { _id: templateId, name: 'Original', ...updateData };
      mockMapTemplateRepository.update.mockResolvedValue(expectedResult);

      const result = await service.updateTemplate(templateId, updateData);

      expect(mockMapTemplateRepository.update).toHaveBeenCalledTimes(1);
      expect(mockMapTemplateRepository.update).toHaveBeenCalledWith(templateId, updateData);
      expect(result).toEqual(expectedResult);
    });
  });
}); 