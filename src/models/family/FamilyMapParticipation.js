import mongoose from 'mongoose';

const familyMapParticipationSchema = new mongoose.Schema({
  familyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Family', 
    required: true, 
    index: true 
  },
  mapId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Map', 
    required: true, 
    index: true 
  },
  tournamentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tournament', 
    required: true, 
    index: true 
  },
  
  isWinner: { 
    type: Boolean, 
    default: false, 
    comment: 'Была ли семья победителем на карте' 
  },
  
  ratingChange: { 
    type: Number, 
    default: 0, 
    comment: 'Изменение рейтинга семьи за эту карту' 
  },
  previousRating: { 
    type: Number, 
    required: true, 
    comment: 'Рейтинг семьи ДО карты' 
  },
  newRating: { 
    type: Number, 
    required: true, 
    comment: 'Рейтинг семьи ПОСЛЕ карты' 
  },
  
  // Агрегированная статистика для быстрого доступа
  totalKills: { type: Number, default: 0 },
  totalDeaths: { type: Number, default: 0 },
  totalDamage: { type: Number, default: 0 },
}, { timestamps: true, collection: 'family_map_participations' });

familyMapParticipationSchema.index({ familyId: 1, mapId: 1 }, { unique: true });

const FamilyMapParticipation = mongoose.models.FamilyMapParticipation || mongoose.model('FamilyMapParticipation', familyMapParticipationSchema);
export default FamilyMapParticipation; 