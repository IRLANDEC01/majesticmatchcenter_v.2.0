import mongoose from 'mongoose';
import seoSchema from '@/models/shared/seo-schema.js';

// --- Вложенные схемы для участников карты ---

const mapParticipantSchema = new mongoose.Schema({
  _id: false, // Не нужен отдельный ID для этого sub-документа
  
  // Ключевая ссылка на объект участника в массиве Tournament.participants.
  // Гарантирует, что на карте играют только зарегистрированные в турнире участники.
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Указываем, на какую модель ссылается это поле.
    // Это зависит от того, как вы храните участников в схеме Tournament.
    // Предположим, там есть ref на 'Family' или 'Player'. Для универсальности
    // можно не указывать, но для populate нужно будет передавать опции.
    // Пока оставим без ref, т.к. это более сложная логика.
    // НО для family-турниров, нам нужен ref на семью.
    ref: 'Family', // Уточняем, что это ссылка на Семью.
  },
  
  // Массив игроков, которые вышли на эту конкретную карту от лица участника.
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  }],
});

// --- Основная схема карты ---

const mapSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название карты является обязательным полем.'],
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
  },
  // Связь с родительским турниром
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true,
  },
  // Ссылка на шаблон, если он использовался
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MapTemplate',
    required: [true, 'Шаблон карты является обязательным полем.'],
  },
  status: {
    type: String,
    required: true,
    enum: ['planned', 'active', 'completed'],
    default: 'planned',
    index: true,
  },
  archivedAt: {
    type: Date,
  },
  // Даты проведения
  startDateTime: {
    type: Date,
    required: [true, 'Время начала карты является обязательным полем.'],
  },
  // Участники этого конкретного матча.
  participants: [mapParticipantSchema],
  
  // Ссылка на победителя (на один из объектов в Tournament.participants).
  winner: {
    type: mongoose.Schema.Types.ObjectId,
  },

  // Ссылка на самого ценного игрока карты.
  mvp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
  },
  
  // SEO-поля
  seo: seoSchema,
}, {
  timestamps: true,
  versionKey: '__v',
});

// Хук для автоматической установки статуса перед сохранением
mapSchema.pre('save', function(next) {
  // `this` - это сохраняемый документ
  // Не меняем статус, если он уже 'completed' или документ не новый/не изменен
  if (this.isModified('startDateTime') || this.isNew) {
    if (this.status !== 'completed') {
      this.status = this.startDateTime > new Date() ? 'planned' : 'active';
    }
  }
  next();
});

// Хук для автоматического исключения архивированных документов из результатов `find`
mapSchema.pre(/^find/, function(next) {
  // `this` - это объект запроса (query)
  if (!this.getOptions().includeArchived) {
    this.where({ archivedAt: { $exists: false } });
  }
  next();
});

// Уникальный индекс, чтобы в одном турнире не было двух карт с одинаковым slug.
mapSchema.index({ tournament: 1, slug: 1 }, { unique: true });

const Map = mongoose.models.Map || mongoose.model('Map', mapSchema);

export default Map; 