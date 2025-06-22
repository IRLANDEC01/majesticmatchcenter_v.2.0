import mongoose from 'mongoose';

const mapTemplateSchema = new mongoose.Schema({
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
  // URL на изображение карты (превью)
  mapImage: {
    type: String,
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
mapTemplateSchema.virtual('isArchived').get(function () {
  return this.archivedAt !== null;
});

// Частичный уникальный индекс для `name`.
// Гарантирует уникальность только среди активных (неархивированных) документов.
mapTemplateSchema.index(
  { name: 1, archivedAt: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } }
);

// Частичный уникальный индекс для `slug`.
mapTemplateSchema.index(
  { slug: 1, archivedAt: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } }
);

// Индекс для быстрого поиска по статусу архивации
mapTemplateSchema.index({ archivedAt: 1 });

// Добавляем pre-save хук для генерации slug из name, если он не предоставлен
mapTemplateSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

const MapTemplate = mongoose.models.MapTemplate || mongoose.model('MapTemplate', mapTemplateSchema);

export default MapTemplate; 