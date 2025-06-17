import { tournamentTemplateRepository } from '@/lib/repos/tournament-templates/tournament-template-repo';

/**
 * @class TournamentTemplateService
 * @description Cервис для управления бизнес-логикой шаблонов турниров.
 * Инкапсулирует логику, работая поверх репозитория.
 */
export class TournamentTemplateService {
  /**
   * @param {object} tournamentTemplateRepository - Репозиторий для работы с данными шаблонов турниров.
   */
  constructor(tournamentTemplateRepository) {
    this.tournamentTemplateRepository = tournamentTemplateRepository;
  }

  /**
   * Создает новый шаблон турнира.
   * В будущем здесь может быть добавлена дополнительная бизнес-логика,
   * например, валидация, проверка прав или публикация событий.
   * @param {object} templateData - Данные для создания шаблона.
   * @returns {Promise<object>} - Созданный объект шаблона турнира.
   */
  async createTemplate(templateData) {
    // Пока что просто проксируем вызов к репозиторию.
    // Это основа для будущих бизнес-правил.
    return this.tournamentTemplateRepository.create(templateData);
  }

  /**
   * Получает все шаблоны турниров.
   * @param {boolean} populateMapTemplates - Флаг для populate связанных шаблонов карт.
   * @returns {Promise<Array<object>>} - Массив шаблонов турниров.
   */
  async getAllTemplates(populateMapTemplates = false) {
    return this.tournamentTemplateRepository.findAll(populateMapTemplates);
  }

  /**
   * Получает шаблон турнира по ID.
   * @param {string} id - ID шаблона.
   * @returns {Promise<object|null>} - Найденный шаблон или null.
   */
  async getTemplateById(id) {
    return this.tournamentTemplateRepository.findById(id);
  }

  /**
   * Обновляет шаблон турнира.
   * @param {string} id - ID шаблона.
   * @param {object} templateData - Данные для обновления.
   * @returns {Promise<object>} - Обновленный объект шаблона турнира.
   */
  async updateTemplate(id, templateData) {
    return this.tournamentTemplateRepository.update(id, templateData);
  }
}

// Экспортируем синглтон-экземпляр сервиса с реальным репозиторием.
// Это основной экземпляр, который будет использоваться в приложении (например, в API-хэндлерах).
export const tournamentTemplateService = new TournamentTemplateService(tournamentTemplateRepository); 