import mongoose from 'mongoose';
import weaponStatSchema from '@/models/shared/weapon-stat-schema.js';
import earningsSchema from '@/models/shared/earnings-schema.js';

const tournamentWonSchema = new mongoose.Schema({
  _id: false,
  templateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TournamentTemplate' 
  },
  templateName: { type: String }, // Денормализованное имя для быстрого отображения
  count: { type: Number, default: 1 },
});

const playerStatsSchema = new mongoose.Schema({
  // Связь с основной моделью игрока
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    unique: true,
    index: true,
  },
  // Статистика за все время
  overall: {
    rating: { type: Number, default: 0, index: true },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    damageDealt: { type: Number, default: 0 },
    mapsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    mapMvps: { type: Number, default: 0 },
    mapTopKills: { type: Number, default: 0 },
    mapTopDamage: { type: Number, default: 0 },
    tournamentsWon: [tournamentWonSchema],
    totalEarnings: [earningsSchema],
    weaponStats: [weaponStatSchema],
  },
  // Статистика за текущий месяц (для топов "за месяц")
  monthly: {
    // Год и месяц для идентификации периода
    period: { type: String, index: true }, // "YYYY-MM"
    rating: { type: Number, default: 0, index: true },
    kills: { type: Number, default: 0, index: true },
    deaths: { type: Number, default: 0, index: true },
    damageDealt: { type: Number, default: 0, index: true },
    mapsPlayed: { type: Number, default: 0, index: true },
    wins: { type: Number, default: 0, index: true },
    weaponStats: [weaponStatSchema],
  },
  // Статистика за текущий год
  yearly: {
    period: { type: String, index: true }, // "YYYY"
    rating: { type: Number, default: 0 },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    damageDealt: { type: Number, default: 0 },
    mapsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    weaponStats: [weaponStatSchema],
  },
  // Архив статистики по годам
  yearlyArchive: [{
    _id: false,
    period: { type: String },
    rating: { type: Number },
    kills: { type: Number },
    deaths: { type: Number },
    damageDealt: { type: Number },
    mapsPlayed: { type: Number },
    wins: { type: Number },
    mvps: { type: Number },
    weaponStats: [weaponStatSchema],
  }],
}, {
  timestamps: true,
  collection: 'player_stats',
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      delete ret.id;
    },
  },
  toObject: {
    virtuals: true,
  },
});

playerStatsSchema.virtual('kdRatio').get(function () {
  const deaths = this.overall?.deaths ?? 0;
  const kills = this.overall?.kills ?? 0;

  if (deaths === 0) {
    return kills;
  }
  return parseFloat((kills / deaths).toFixed(2));
});

const PlayerStats = mongoose.models.PlayerStats || mongoose.model('PlayerStats', playerStatsSchema);

export default PlayerStats; 