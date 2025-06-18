import mongoose from 'mongoose';
import weaponStatSchema from '@/models/shared/weapon-stat-schema.js';

const playerMapParticipationSchema = new mongoose.Schema({
  // Связи с другими сущностями
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' }, // Семья, за которую играл

  // Статистика за карту (аналогично JSON-файлу)
  kills: { type: Number, required: true },
  deaths: { type: Number, required: true },
  damageDealt: { type: Number, required: true },
  shotsFired: { type: Number, default: 0 },
  hits: { type: Number, default: 0 },
  hitAccuracy: { type: Number, default: 0 },
  headshots: { type: Number, default: 0 },
  headshotAccuracy: { type: Number, default: 0 },
  
  // НОВЫЕ ПОЛЯ для контекста рейтинга
  ratingChange: { 
    type: Number, 
    default: 0,
    comment: 'Изменение рейтинга игрока за эту карту'
  },
  previousRating: {
    type: Number,
    required: true,
    comment: 'Рейтинг игрока ДО этой карты'
  },
  newRating: {
    type: Number,
    required: true,
    comment: 'Рейтинг игрока ПОСЛЕ этой карты'
  },

  // Детальная статистика по оружию за эту карту
  weaponStats: [weaponStatSchema],
}, {
  timestamps: true,
  versionKey: '__v',
});

// Уникальный составной индекс, чтобы предотвратить дублирование записи
// для одного и того же игрока на одной и той же карте.
playerMapParticipationSchema.index({ playerId: 1, mapId: 1 }, { unique: true });

const PlayerMapParticipation = mongoose.models.PlayerMapParticipation || mongoose.model('PlayerMapParticipation', playerMapParticipationSchema);

export default PlayerMapParticipation; 