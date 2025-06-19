import mongoose from 'mongoose';
import { prizeRuleSchema } from './Tournament.js';

const tournamentTemplateSchema = new mongoose.Schema({
  // Название шаблона, например, "Majestic Cup: Summer"
  name: {
    type: String,
    required: [true, 'Название шаблона турнира является обязательным полем.'],
    trim: true,
    unique: true,
  },
  // Уникальный идентификатор для URL, например, "majestic-cup-summer"
  slug: {
    type: String,
    required: [true, 'Slug является обязательным полем.'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  // Краткое описание шаблона
  description: {
    type: String,
    trim: true,
  },
  // URL на стандартное изображение для турниров, созданных по этому шаблону
  defaultImage: {
    type: String,
    trim: true,
  },
  // Правила турнира
  rules: {
    type: String,
    trim: true,
  },
  // Призовой фонд
  prizePool: {
    type: [prizeRuleSchema],
  },
  // Сценарий турнира: массив ID шаблонов карт
  mapTemplates: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MapTemplate'
    }],
    required: [true, 'Сценарий турнира (шаблоны карт) является обязательным полем.'],
    validate: [v => Array.isArray(v) && v.length > 0, 'Сценарий должен содержать хотя бы один шаблон карты.'],
  },
  // Счетчик, сколько раз этот шаблон был использован
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Счетчик использования не может быть отрицательным.'],
  },
  archivedAt: {
    type: Date,
  },
}, {
  // Добавляет поля createdAt и updatedAt
  timestamps: true,
  // Включаем optimistic concurrency control
  versionKey: '__v',
});

// Добавляем pre-save хук для генерации slug из name, если он не предоставлен
tournamentTemplateSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

// Хук для автоматического исключения архивированных документов из результатов `find`
tournamentTemplateSchema.pre(/^find/, function(next) {
  // `this` - это объект запроса (query)
  if (!this.getOptions().includeArchived) {
    this.where({ archivedAt: { $exists: false } });
  }
  next();
});

const TournamentTemplate = mongoose.models.TournamentTemplate || mongoose.model('TournamentTemplate', tournamentTemplateSchema);

export default TournamentTemplate; 