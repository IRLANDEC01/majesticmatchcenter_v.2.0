import { Schema, model, models, Document, CallbackWithoutResultAndOptionalError, Model } from 'mongoose';
import slugify from 'slugify';
import { IImageSet, IImageKeys, imageSetSchema, imageKeysSchema } from '../shared/image-set-schema';

/**
 * @description Интерфейс, описывающий документ шаблона карты в базе данных.
 */
export interface IMapTemplate extends Document {
  /** Название шаблона, например, "de_dust2". */
  name: string;
  /** Уникальный идентификатор для URL, например, "de-dust2". */
  slug: string;
  /** Краткое описание шаблона. */
  description?: string;
  /** Публичные URL изображений карты в разных размерах. */
  imageUrls: IImageSet;
  /** S3-ключи для управления файлами изображений. */
  imageKeys: IImageKeys;
  /** Дата архивации. Если установлена, шаблон считается архивным. */
  archivedAt?: Date;
  /** Дата создания документа. */
  createdAt: Date;
  /** Дата последнего обновления документа. */
  updatedAt: Date;
  /** Версия схемы для поддержки будущих миграций. */
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
      minlength: [3, 'Название должно содержать минимум 3 символа.'],
      maxlength: [50, 'Название не должно превышать 50 символов.'],
    trim: true,
      comment: 'Название шаблона, например, "de_dust2".',
  },
  slug: {
    type: String,
    trim: true,
      lowercase: true,
      comment: 'Уникальный идентификатор для URL, например, "de-dust2".',
  },
  description: {
    type: String,
      maxlength: [500, 'Описание не должно превышать 500 символов.'],
    trim: true,
      comment: 'Краткое описание шаблона.',
  },
    imageUrls: {
      type: imageSetSchema,
      required: [true, 'Набор URL изображений обязателен.'],
      comment: 'Публичные URL изображений карты в разных размерах.',
    },
    imageKeys: {
      type: imageKeysSchema,
      required: [true, 'Набор S3-ключей изображений обязателен.'],
      comment: 'S3-ключи изображений для управления файлами.',
  },
  archivedAt: {
    type: Date,
      comment: 'Дата архивации шаблона.',
    },
    schemaVersion: {
      type: Number,
      default: 1,
      required: true,
      comment: 'Версия схемы для поддержки будущих миграций.',
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

mapTemplateSchema.virtual('isArchived').get(function (this: IMapTemplate) {
  return this.archivedAt != null;
});

// Индексы
mapTemplateSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
mapTemplateSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
mapTemplateSchema.index({ schemaVersion: 1 });

// Хук для генерации slug
mapTemplateSchema.pre('save', function (this: IMapTemplate, next: CallbackWithoutResultAndOptionalError) {
  if (this.isNew || this.isModified('name')) {
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