import mongoose from 'mongoose';
import earningsSchema from '@/models/shared/earnings-schema.js';

// Схема для отслеживания выигранных турниров
const tournamentWonSchema = new mongoose.Schema({
  _id: false,
  templateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TournamentTemplate' 
  },
  templateName: { type: String }, // Денормализованное имя для быстрого отображения
  count: { type: Number, default: 1 },
});

const familyStatsSchema = new mongoose.Schema({
  // Связь с основной моделью семьи
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    unique: true,
    index: true,
  },
  
  rating: {
    type: Number,
    default: 0,
    index: true,
  },

  // Статистика за все время
  overall: {
    mapsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    tournamentsPlayed: { type: Number, default: 0 },
    tournamentsWon: [tournamentWonSchema],
    totalEarnings: [earningsSchema],
  },
  
  // Статистика за текущий месяц
  monthly: {
    period: { type: String, index: true }, // "YYYY-MM"
    mapsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },

  // Статистика за текущий год
  yearly: {
    period: { type: String, index: true }, // "YYYY"
    mapsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },

  // Архив статистики по годам
  yearlyArchive: [{
    _id: false,
    period: { type: String },
    mapsPlayed: { type: Number },
    wins: { type: Number },
    tournamentsPlayed: { type: Number },
  }],
}, {
  timestamps: true,
  versionKey: '__v',
});

const FamilyStats = mongoose.models.FamilyStats || mongoose.model('FamilyStats', familyStatsSchema);

export default FamilyStats; 