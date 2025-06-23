import mongoose, { Document, Model, Schema } from 'mongoose';

// =================================
// Интерфейс для документа MapTemplate
// Описывает поля, которые есть у каждой записи в БД
// =================================
export interface IMapTemplate extends Document {
  /** Название шаблона, например, "Захват флага на 'Стройке'" */
  name: string;
  /** Уникальный идентификатор для URL, например, "ctf-construction" */
  slug: string;
  /** Краткое описание шаблона карты */
  description?: string;
  /** URL на изображение шаблона карты (превью) */
  mapTemplateImage: string;
  /** Счетчик, сколько раз этот шаблон был использован */
  usageCount: number;
  /** Дата архивации. null, если активен */
  archivedAt: Date | null;
  /** Виртуальное поле для проверки статуса архивации */
  isArchived: boolean;
}

// =================================
// Схема Mongoose
// Определяет структуру, валидаторы и индексы
// =================================
const mapTemplateSchema = new Schema<IMapTemplate>({
  // Название шаблона, например, "Захват флага на 'Стройке'"
  name: {
    type: String,
    required: [true, 'Название шаблона карты обязательно.'],
    trim: true,
    maxlength: [100, 'Название шаблона карты не может превышать 100 символов.'],
  },
  // Уникальный идентификатор для URL, например, "ctf-construction"
  slug: {
    type: String,
    required: [true, 'Slug шаблона карты обязателен.'],
    trim: true,
    maxlength: [100, 'Slug шаблона карты не может превышать 100 символов.'],
  },
  // Краткое описание шаблона карты
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание шаблона карты не может превышать 500 символов.'],
  },
  // URL на изображение шаблона карты (превью)
  mapTemplateImage: {
    type: String,
    required: [true, 'Изображение для шаблона карты обязательно.'],
    trim: true,
  },
  // Счетчик, сколько раз этот шаблон был использован
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Счетчик использований не может быть отрицательным.'],
  },
  archivedAt: {
    type: Date,
    default: null,
  },
}, {
  // Добавляет поля createdAt и updatedAt
  timestamps: true,
  // Включаем optimistic concurrency control
  versionKey: '__v',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Виртуальное поле для удобной проверки, архивирован ли шаблон
mapTemplateSchema.virtual('isArchived').get(function (this: IMapTemplate) {
  return this.archivedAt !== null;
});

// Частичный уникальный индекс для `name`.
// Гарантирует уникальность только среди активных (неархивированных) документов.
mapTemplateSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } }
);

// Частичный уникальный индекс для `slug`.
mapTemplateSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } }
);

// Индекс для быстрого поиска по статусу архивации
mapTemplateSchema.index({ archivedAt: 1 });

// =================================
// Хуки Mongoose
// Логика, которая выполняется до или после определенных операций
// =================================

// Pre-save хук для генерации slug из name, если он не предоставлен
mapTemplateSchema.pre('validate', function(this: IMapTemplate, next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

// =================================
// Создание и экспорт модели
// =================================
const MapTemplate: Model<IMapTemplate> = mongoose.models.MapTemplate || mongoose.model<IMapTemplate>('MapTemplate', mapTemplateSchema);

export default MapTemplate; 