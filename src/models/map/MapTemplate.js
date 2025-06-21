import mongoose from 'mongoose';

const mapTemplateSchema = new mongoose.Schema({
  // Название шаблона, например, "Захват флага на 'Стройке'"
  name: {
    type: String,
    required: [true, 'Название шаблона является обязательным полем.'],
    trim: true,
  },
  // Уникальный идентификатор для URL, например, "ctf-construction"
  slug: {
    type: String,
    required: [true, 'Slug является обязательным полем.'],
    trim: true,
    lowercase: true,
  },
  // Краткое описание шаблона карты
  description: {
    type: String,
    trim: true,
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

// Частичный уникальный индекс для `name`.
// Гарантирует уникальность только среди активных (неархивированных) документов.
mapTemplateSchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { archivedAt: null },
  }
);

// Частичный уникальный индекс для `slug`.
mapTemplateSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { archivedAt: null },
  }
);

// Добавляем pre-save хук для генерации slug из name, если он не предоставлен
mapTemplateSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

// Хук для автоматического исключения архивированных документов из результатов `find`
mapTemplateSchema.pre(/^find/, function(next) {
  // `this` - это объект запроса (query)
  if (!this.getOptions().includeArchived) {
    this.where({ archivedAt: null });
  }
  next();
});

const MapTemplate = mongoose.models.MapTemplate || mongoose.model('MapTemplate', mapTemplateSchema);

export default MapTemplate; 