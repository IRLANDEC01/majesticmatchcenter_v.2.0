import mongoose from 'mongoose';
import weaponStatSchema from '@/models/shared/weapon-stat-schema.js';

/**
 * @typedef {object} PlayerMapParticipation
 * @description Эта модель хранит полную информацию об участии одного игрока в одной карте.
 *              Включает в себя как игровую статистику, так и изменение рейтинга.
 */
const playerMapParticipationSchema = new mongoose.Schema({
  // --- Связи ---
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true,
    comment: 'ID игрока',
  },
  mapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Map',
    required: true,
    index: true,
    comment: 'ID карты',
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    comment: 'ID турнира, в рамках которого проходила карта',
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    comment: 'Семья, за которую игрок выступал на этой карте',
  },

  // --- Изменение рейтинга ---
  ratingChange: {
    type: Number,
    required: true,
    comment: 'Изменение рейтинга игрока по итогам карты. Может быть положительным, отрицательным или 0.',
  },
  reason: {
    type: String,
    required: true,
    comment: 'Причина изменения рейтинга (например, \'map_completion\').',
  },
  earnedAt: {
    type: Date,
    default: Date.now,
    comment: 'Дата и время, когда был получен результат.',
  },

  // --- Игровая статистика за карту ---
  kills: { type: Number, required: true, comment: 'Количество убийств' },
  deaths: { type: Number, required: true, comment: 'Количество смертей' },
  damageDealt: { type: Number, required: true, comment: 'Нанесенный урон' },
  shotsFired: { type: Number, default: 0, comment: 'Выстрелов сделано' },
  hits: { type: Number, default: 0, comment: 'Попаданий' },
  hitAccuracy: { type: Number, default: 0, comment: 'Точность стрельбы (%)' },
  headshots: { type: Number, default: 0, comment: 'Попаданий в голову' },
  headshotAccuracy: { type: Number, default: 0, comment: 'Точность стрельбы в голову (%)' },
  
  // --- Детальная статистика по оружию ---
  weaponStats: [weaponStatSchema],
}, {
  timestamps: true,
  versionKey: false,
});

// Уникальный составной индекс, чтобы предотвратить дублирование записи
// для одного и того же игрока на одной и той же карте.
playerMapParticipationSchema.index({ playerId: 1, mapId: 1 }, { unique: true });

const PlayerMapParticipation = mongoose.models.PlayerMapParticipation || mongoose.model('PlayerMapParticipation', playerMapParticipationSchema);

export default PlayerMapParticipation; 