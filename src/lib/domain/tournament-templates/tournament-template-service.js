import { DuplicateError, NotFoundError, ValidationError, AppError } from '@/lib/errors';
import tournamentTemplateRepo from '@/lib/repos/tournament-templates/tournament-template-repo';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import tournamentRepo from '@/lib/repos/tournaments/tournament-repo';

class TournamentTemplateService {
  constructor(repos) {
    this.tournamentTemplateRepo = repos.tournamentTemplateRepo;
    this.mapTemplateRepo = repos.mapTemplateRepo;
    this.tournamentRepo = repos.tournamentRepo;
  }
  
  async _validateMapTemplates(mapTemplateIds) {
    if (!mapTemplateIds || mapTemplateIds.length === 0) {
      throw new ValidationError('Необходимо указать хотя бы один шаблон карты.');
    }
    const mapTemplates = await this.mapTemplateRepo.find({ filter: { _id: { $in: mapTemplateIds } } });
    if (mapTemplates.data.length !== mapTemplateIds.length) {
      throw new NotFoundError('Один или несколько указанных шаблонов карт не найдены.');
    }
    const archived = mapTemplates.data.some(template => template.archivedAt);
    if (archived) {
      throw new ValidationError('Нельзя использовать архивные шаблоны карт.');
    }
  }

  async createTemplate(templateData) {
    await this._validateMapTemplates(templateData.mapTemplates);
    try {
      return await this.tournamentTemplateRepo.create(templateData);
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон турнира с таким названием или slug уже существует.');
      }
      throw error;
    }
  }

  async getAllTemplates(options = {}) {
    return this.tournamentTemplateRepo.find(options);
  }

  async getTemplateById(id) {
    const template = await this.tournamentTemplateRepo.findById(id);
    if (!template) {
      throw new NotFoundError(`Шаблон турнира с ID ${id} не найден.`);
    }
    return template;
  }

  async updateTemplate(id, templateData) {
    await this.getTemplateById(id);
    if (templateData.mapTemplates) {
      await this._validateMapTemplates(templateData.mapTemplates);
    }
    try {
      return await this.tournamentTemplateRepo.update(id, templateData);
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateError('Шаблон турнира с таким названием или slug уже существует.');
      }
      throw error;
    }
  }
  
  async archiveTemplate(templateId) {
    const existingTemplate = await this.getTemplateById(templateId);

    const activeTournaments = await this.tournamentRepo.find({ 
      filter: { template: templateId, status: { $ne: 'completed' } } 
    });

    if (activeTournaments.total > 0) {
      throw new AppError('Нельзя архивировать шаблон, который используется в активных или запланированных турнирах.', 409);
    }
    
    return this.tournamentTemplateRepo.archive(existingTemplate._id);
  }

  async restoreTemplate(templateId) {
    // Используем findById с опцией, чтобы найти даже архивированный.
    const existingTemplate = await this.tournamentTemplateRepo.findById(templateId, { includeArchived: true });
    if (!existingTemplate) {
      throw new NotFoundError(`Шаблон турнира с ID ${templateId} не найден для восстановления.`);
    }
    return this.tournamentTemplateRepo.restore(templateId);
  }
}

const tournamentTemplateService = new TournamentTemplateService({
  tournamentTemplateRepo,
  mapTemplateRepo,
  tournamentRepo,
});

export default tournamentTemplateService;