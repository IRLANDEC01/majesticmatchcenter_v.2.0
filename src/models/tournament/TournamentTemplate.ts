import mongoose, { Document, Model, Schema, model, HookNextFunction } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { CURRENCY_VALUES, RESULT_TIERS_ENUM } from '@/lib/constants';

/**
 * @interface IPrizeRule
 * @description Интерфейс для правила распределения призов. Может быть использован и в шаблонах, и в турнирах.
 */
export interface IPrizeRule {
  target?: {
    tier?: string; // Категория результата (например, "winner")
    rank?: number; // Конкретное место (например, 1)
  };
  currency: string; // Валюта приза
  amount: number; // Сумма приза
}

/**
 * @interface ITournamentTemplate
 * @extends Document
 * @description Интерфейс, описывающий документ шаблона турнира в базе данных.
 */
export interface ITournamentTemplate extends Document {
  /** Название шаблона, например, "Majestic Cup: Summer" */
  name: string;
  /** Уникальный идентификатор для URL, например, "majestic-cup-summer" */
  slug: string;
  /** Краткое описание шаблона */
  description?: string;
  /** URL на стандартное изображение для турниров, созданных по этому шаблону */
  defaultImage?: string;
  /** Правила турнира в текстовом формате */
  rules?: string;
  /** Структура призового фонда */
  prizePool?: IPrizeRule[];
  /** Сценарий турнира: массив ID или документов шаблонов карт */
  mapTemplates: (Schema.Types.ObjectId | IMapTemplate)[];
  /** Счетчик, сколько раз этот шаблон был использован */
  usageCount: number;
  /** Виртуальное поле для проверки, архивирован ли шаблон */
  isArchived: boolean;
  /** Дата архивации для мягкого удаления */
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @interface ITournamentTemplateModel
 * @extends Model<ITournamentTemplate>
 * @description Интерфейс для модели Mongoose, позволяет добавлять статические методы.
 */
export interface ITournamentTemplateModel extends Model<ITournamentTemplate> {}

/**
 * @const prizeRuleSchema
 * @description Схема Mongoose для правила выдачи приза. Вынесена для переиспользования.
 */
export const prizeRuleSchema = new Schema<IPrizeRule>({
  target: {
    tier: { type: String, enum: RESULT_TIERS_ENUM },
    rank: { type: Number, min: 1 },
  },
  currency: {
    type: String,
    required: true,
    enum: CURRENCY_VALUES,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Сумма приза не может быть отрицательной.'],
  },
}, { _id: false });

const tournamentTemplateSchema = new Schema<ITournamentTemplate, ITournamentTemplateModel>({
  name: { type: String, required: [true, 'Название шаблона турнира является обязательным полем.'], trim: true, comment: 'Название шаблона, например, "Majestic Cup: Summer"' },
  slug: { type: String, required: [true, 'Slug является обязательным полем.'], trim: true, lowercase: true, comment: 'Уникальный идентификатор для URL, например, "majestic-cup-summer"' },
  description: { type: String, trim: true, comment: 'Краткое описание шаблона' },
  defaultImage: { type: String, trim: true, comment: 'URL на стандартное изображение для турниров' },
  rules: { type: String, trim: true, comment: 'Правила турнира в текстовом формате' },
  prizePool: { type: [prizeRuleSchema], comment: 'Структура призового фонда' },
  mapTemplates: {
    type: [{ type: Schema.Types.ObjectId, ref: 'MapTemplate' }],
    required: [true, 'Сценарий турнира (шаблоны карт) является обязательным полем.'],
    validate: [(v: unknown[]) => Array.isArray(v) && v.length > 0, 'Сценарий должен содержать хотя бы один шаблон карты.'],
    comment: 'Сценарий турнира: массив ID шаблонов карт',
  },
  usageCount: { type: Number, default: 0, min: [0, 'Счетчик использования не может быть отрицательным.'], comment: 'Счетчик использования шаблона' },
  archivedAt: { type: Date, comment: 'Дата архивации для мягкого удаления' },
}, {
  timestamps: true,
  versionKey: '__v',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Виртуальное поле
tournamentTemplateSchema.virtual('isArchived').get(function(this: ITournamentTemplate) {
  return this.archivedAt != null;
});

// Индексы
tournamentTemplateSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
tournamentTemplateSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });

// Хук для генерации slug
tournamentTemplateSchema.pre('validate', function(this: ITournamentTemplate, next: HookNextFunction) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

const TournamentTemplate = (mongoose.models.TournamentTemplate as ITournamentTemplateModel) || model<ITournamentTemplate, ITournamentTemplateModel>('TournamentTemplate', tournamentTemplateSchema);

export default TournamentTemplate; 