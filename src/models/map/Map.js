import mongoose from 'mongoose';
import seoSchema from '@/models/shared/seo-schema.js';
import { LIFECYCLE_STATUSES_ENUM, LIFECYCLE_STATUSES } from '@/lib/constants';

// --- Вложенные схемы для участников карты ---

const mapParticipantSchema = new mongoose.Schema({
  _id: false, // Не нужен отдельный ID для этого sub-документа
  
  // Ключевая ссылка на ID объекта в массиве `Tournament.participants`.
  // Гарантирует, что на карте играют только зарегистрированные в турнире участники.
  // ref убран, т.к. это ссылка на sub-документ, а не на другую коллекцию.
  // Логика сервиса будет отвечать за "наполнение" этих данных из родительского турнира.
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
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
    enum: LIFECYCLE_STATUSES_ENUM,
    default: LIFECYCLE_STATUSES.PLANNED,
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
    if (this.status !== LIFECYCLE_STATUSES.COMPLETED) {
      this.status = this.startDateTime > new Date() ? LIFECYCLE_STATUSES.PLANNED : LIFECYCLE_STATUSES.ACTIVE;
    }
  }
  next();
});

// Хук для автоматического исключения архивированных документов из результатов `find`
mapSchema.pre(/^find/, function(next) {
  // `this` - это объект запроса (query)
  if (!this.getOptions().includeArchived) {
    // Ищем документы, у которых поле archivedAt либо равно null, либо не существует.
    // Это самая надежная проверка для исключения "мягко удаленных" записей.
    this.where({ archivedAt: null });
  }
  next();
});

// Виртуальное поле для удобства
mapSchema.virtual('isArchived').get(function() {
  return !!this.archivedAt;
});

// Уникальный индекс, чтобы в одном турнире не было двух карт с одинаковым slug.
mapSchema.index({ tournament: 1, slug: 1 }, { unique: true });

const Map = mongoose.models.Map || mongoose.model('Map', mapSchema);

export default Map; 