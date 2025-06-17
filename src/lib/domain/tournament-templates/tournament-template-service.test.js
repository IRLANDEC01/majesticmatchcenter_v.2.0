import { TournamentTemplateService } from './tournament-template-service.js';

// 1. Создаем мок (mock) репозитория.
// Это фальшивый объект, который имитирует настоящий репозиторий.
const mockTournamentTemplateRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

// 2. Очищаем моки перед каждым тестом для чистоты эксперимента.
beforeEach(() => {
  jest.clearAllMocks();
});

describe('TournamentTemplateService', () => {
  // 3. Создаем экземпляр сервиса, передавая ему наш мок-репозиторий.
  const service = new TournamentTemplateService(mockTournamentTemplateRepository);

  describe('createTemplate', () => {
    it('должен вызывать метод create репозитория с правильными данными', async () => {
      // Подготовка данных
      const templateData = { name: 'New Tournament', slug: 'new-tournament' };
      const expectedResult = { _id: 'some-id', ...templateData };

      // Настраиваем мок: если будет вызван метод 'create', он должен вернуть 'expectedResult'.
      mockTournamentTemplateRepository.create.mockResolvedValue(expectedResult);

      // Вызываем метод сервиса, который мы тестируем
      const result = await service.createTemplate(templateData);

      // Проверки:
      // Убеждаемся, что метод 'create' репозитория был вызван.
      expect(mockTournamentTemplateRepository.create).toHaveBeenCalledTimes(1);
      // Убеждаемся, что он был вызван именно с нашими данными.
      expect(mockTournamentTemplateRepository.create).toHaveBeenCalledWith(templateData);
      // Убеждаемся, что сервис вернул результат, который мы ожидали от репозитория.
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllTemplates', () => {
    it('должен вызывать метод findAll репозитория', async () => {
      const expectedTemplates = [{ name: 'Tournament 1' }, { name: 'Tournament 2' }];
      mockTournamentTemplateRepository.findAll.mockResolvedValue(expectedTemplates);

      const result = await service.getAllTemplates();

      expect(mockTournamentTemplateRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedTemplates);
    });
  });

  describe('getTemplateById', () => {
    it('должен вызывать метод findById репозитория с правильным ID', async () => {
      const templateId = 'template-123';
      const expectedTemplate = { _id: templateId, name: 'Found Tournament' };
      mockTournamentTemplateRepository.findById.mockResolvedValue(expectedTemplate);

      const result = await service.getTemplateById(templateId);

      expect(mockTournamentTemplateRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockTournamentTemplateRepository.findById).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(expectedTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('должен вызывать метод update репозитория с правильными данными', async () => {
      const templateId = 'template-to-update';
      const updateData = { description: 'New tournament description' };
      const expectedResult = { _id: templateId, name: 'Original Tournament', ...updateData };
      mockTournamentTemplateRepository.update.mockResolvedValue(expectedResult);

      const result = await service.updateTemplate(templateId, updateData);

      expect(mockTournamentTemplateRepository.update).toHaveBeenCalledTimes(1);
      expect(mockTournamentTemplateRepository.update).toHaveBeenCalledWith(templateId, updateData);
      expect(result).toEqual(expectedResult);
    });
  });
}); 