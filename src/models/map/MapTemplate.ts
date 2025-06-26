import { Schema, model, models, Document, CallbackWithoutResultAndOptionalError, Model } from 'mongoose';
import slugify from 'slugify';

/**
 * @description Интерфейс, описывающий документ шаблона карты в базе данных.
 */
export interface IMapTemplate extends Document {
  /** Название шаблона, например, "de_dust2" */
  name: string;
  slug: string;
  description?: string;
  mapTemplateImage: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

// =================================
// Schema
// =================================

const mapTemplateSchema = new Schema<IMapTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Название шаблона карты является обязательным полем.'],
      minlength: [3, 'Название должно содержать минимум 3 символа'],
      maxlength: [50, 'Название не должно превышать 50 символов'],
      trim: true,
      comment: 'Название шаблона, например, "de_dust2"',
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      comment: 'Уникальный идентификатор для URL, например, "de-dust2"',
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не должно превышать 500 символов'],
      trim: true,
      comment: 'Версия схемы для поддержки будущих миграций данных.',
    },
    mapTemplateImage: {
      type: String,
      required: true,
      trim: true,
    },
    archivedAt: {
      type: Date,
    },
    schemaVersion: {
      type: Number,
      default: 1,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =================================
// Hooks
// =================================

// Виртуальное поле
mapTemplateSchema.virtual('isArchived').get(function (this: IMapTemplate) {
  return this.archivedAt != null;
});

// Индексы
mapTemplateSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
mapTemplateSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });

// Хук для генерации slug
mapTemplateSchema.pre('save', function (this: IMapTemplate, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// =================================
// Model
// =================================

const MapTemplate =
  (models.MapTemplate as Model<IMapTemplate>) ||
  model<IMapTemplate>('MapTemplate', mapTemplateSchema);

export default MapTemplate; 