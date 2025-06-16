import mongoose from 'mongoose';

const playerTournamentParticipationSchema = new mongoose.Schema({
  // Связи
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' }, // Семья, за которую играл

  // Агрегированная статистика за весь турнир
  kills: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 },
  damageDealt: { type: Number, default: 0 },
  mapsPlayed: { type: Number, default: 0 },
  
  // Результаты
  isWinner: { type: Boolean, default: false }, // Был ли игрок в команде-победителе
  isMvp: { type: Boolean, default: false }, // Был ли игрок MVP турнира
  
}, {
  timestamps: true,
  versionKey: '__v',
});

// Уникальный составной индекс, чтобы предотвратить дублирование записи
// для одного и того же игрока на одном и том же турнире.
playerTournamentParticipationSchema.index({ playerId: 1, tournamentId: 1 }, { unique: true });

const PlayerTournamentParticipation = mongoose.models.PlayerTournamentParticipation || mongoose.model('PlayerTournamentParticipation', playerTournamentParticipationSchema);

export default PlayerTournamentParticipation; 