import mongoose from 'mongoose';
import seoSchema from '@/models/shared/seo-schema.js';
import { CURRENCY_VALUES } from '@/lib/constants';

// --- Вложенные схемы для участников ---

/**
 * Схема, описывающая участника на уровне турнира.
 * Это может быть либо постоянная семья, либо временная команда.
 */
const tournamentParticipantSchema = new mongoose.Schema({
  // Тип участника: 'family' или 'team'. Определяет, на какое поле смотреть.
  participantType: {
    type: String,
    required: true,
    enum: ['family', 'team'],
  },
  // Если это семья, здесь будет ссылка на модель Family.
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    // Поле обязательно, если participantType === 'family'.
    required: function() { return this.participantType === 'family'; }
  },
  // Если это временная команда, здесь будет ее название.
  teamName: {
    type: String,
    trim: true,
    // Поле обязательно, если participantType === 'team'.
    required: function() { return this.participantType === 'team'; }
  },
});

/**
 * Схема для описания призового фонда.
 * Позволяет задавать несколько призов для разных мест в разных валютах.
 */
const prizeSchema = new mongoose.Schema({
  _id: false,
  // За какое место предназначен приз (1-е, 2-е и т.д.).
  place: {
    type: Number,
    required: [true, 'Место для приза обязательно.'],
    min: [1, 'Место не может быть меньше 1.'],
  },
  // Валюта приза.
  currency: {
    type: String,
    required: true,
    enum: {
      values: CURRENCY_VALUES,
      message: 'Валюта {VALUE} не поддерживается.',
    },
  },
  // Сумма приза.
  amount: {
    type: Number,
    required: true,
    min: [0, 'Сумма приза не может быть отрицательной.'],
  },
});

// --- Основная схема турнира ---

const tournamentSchema = new mongoose.Schema({
  // Основное название турнира.
  name: {
    type: String,
    required: [true, 'Название турнира является обязательным полем.'],
    trim: true,
  },
  // Уникальный идентификатор для URL. Генерируется автоматически.
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // Ссылка на шаблон, по которому был создан турнир.
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentTemplate',
    required: true,
  },
  // Тип турнира, определяет логику добавления игроков на карты.
  tournamentType: {
    type: String,
    required: true,
    enum: ['family', 'team'],
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['planned', 'active', 'completed'],
    default: 'planned',
    index: true,
  },
  // Даты проведения
  startDate: {
    type: Date,
    required: true,
  },
  // Дата окончания. Может быть не задана для турниров без определенной даты конца.
  endDate: {
    type: Date,
  },
  // Призовой фонд турнира.
  prizePool: [prizeSchema],
  // Пул участников, зарегистрированных на турнир.
  participants: [tournamentParticipantSchema],
  // Ссылка на победителя (на один из объектов в массиве participants).
  winner: {
    type: mongoose.Schema.Types.ObjectId,
  },
  // Ссылка на самого ценного игрока турнира (денормализация для быстрого доступа).
  mvp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
  },
  // SEO поля
  seo: seoSchema,
}, {
  timestamps: true,
  versionKey: '__v',
});

// Хук для автоматической генерации slug из name
tournamentSchema.pre('validate', function(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  
  // Валидация, чтобы дата окончания не была раньше даты начала
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'Дата окончания не может быть раньше даты начала.', this.endDate);
  }
  
  next();
});

const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);

export default Tournament; 