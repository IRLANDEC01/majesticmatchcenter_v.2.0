import mongoose, { Model, Schema, model } from 'mongoose';
import { IMapTemplate } from '@/models/map/MapTemplate';
import { CURRENCY_VALUES, RESULT_TIERS_ENUM } from '@/lib/constants';

/**
 * @interface IPrizeRule
 * @description Интерфейс для правила распределения призов. Может быть использован и в шаблонах, и в турнирах.
 */
export interface IPrizeRule {
  target: {
    tier?: string; // e.g., 'winner'
    rank?: {
      from?: number; // e.g., 1
      to?: number;   // e.g., 3
    };
  };
  reward?: {
    amount: number;
    currency: string;
  };
  pot?: {
    amount: number;
    currency: string;
  };
}

/**
 * @interface ITournamentTemplate
 * @description Интерфейс, описывающий документ шаблона турнира в базе данных.
 */
export interface ITournamentTemplate {
  /** Название шаблона, например, "Majestic Cup: Summer" */
  name: string;
  /** Уникальный идентификатор для URL, например, "majestic-cup-summer" */
  slug: string;
  /** Краткое описание шаблона */
  description?: string;
  /** URL на изображение для турниров, созданных по этому шаблону */
  tournamentTemplateImage: string;
  /** Структура призового фонда */
  prizePool?: IPrizeRule[];
  /** Сценарий турнира: массив ID или документов шаблонов карт */
  mapTemplates: (mongoose.Types.ObjectId | IMapTemplate)[];
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
 * @const prizeRuleSchema
 * @description Схема Mongoose для правила выдачи приза. Вынесена для переиспользования.
 */
export const prizeRuleSchema = new Schema<IPrizeRule>({
  target: {
    type: {
      tier: { type: String, enum: RESULT_TIERS_ENUM },
      rank: {
        from: { type: Number, min: 1 },
        to: { type: Number, min: 1 },
      },
    },
    required: true,
  },
  reward: {
    type: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, enum: CURRENCY_VALUES },
    },
  },
  pot: {
    type: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, enum: CURRENCY_VALUES },
    },
  },
}, { _id: false });

const tournamentTemplateSchema = new Schema<ITournamentTemplate>({
  name: { type: String, required: [true, 'Название шаблона турнира является обязательным полем.'], trim: true, minlength: [3, 'Название должно содержать минимум 3 символа.'], comment: 'Название шаблона, например, "Majestic Cup: Summer"' },
  slug: { type: String, required: [true, 'Slug является обязательным полем.'], trim: true, lowercase: true, comment: 'Уникальный идентификатор для URL, например, "majestic-cup-summer"' },
  description: { type: String, trim: true, maxlength: [1000, 'Описание не может превышать 1000 символов.'], comment: 'Краткое описание шаблона' },
  tournamentTemplateImage: { type: String, trim: true, required: [true, 'Изображение для шаблона турнира обязательно.'], comment: 'URL на изображение для турниров, созданных по этому шаблону' },
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
tournamentTemplateSchema.virtual('isArchived').get(function (this: ITournamentTemplate) {
  return this.archivedAt != null;
});

// Индексы
tournamentTemplateSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
tournamentTemplateSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });

// Хук для генерации slug
tournamentTemplateSchema.pre('validate', function (this: ITournamentTemplate, next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

const TournamentTemplate = (mongoose.models.TournamentTemplate as Model<ITournamentTemplate>) || model<ITournamentTemplate>('TournamentTemplate', tournamentTemplateSchema);

export default TournamentTemplate; 