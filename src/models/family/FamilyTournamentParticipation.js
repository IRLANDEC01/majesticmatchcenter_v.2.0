import mongoose from 'mongoose';

const familyTournamentParticipationSchema = new mongoose.Schema({
  familyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Family', 
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
    comment: 'Была ли семья победителем турнира'
  },
  
  mapsPlayed: { 
    type: Number, 
    default: 0 
  },
  mapsWon: { 
    type: Number, 
    default: 0 
  },
  
  totalKills: { type: Number, default: 0 },
  totalDeaths: { type: Number, default: 0 },
  totalDamage: { type: Number, default: 0 },

}, { timestamps: true, collection: 'family_tournament_participations' });

familyTournamentParticipationSchema.index({ familyId: 1, tournamentId: 1 }, { unique: true });

const FamilyTournamentParticipation = mongoose.models.FamilyTournamentParticipation || mongoose.model('FamilyTournamentParticipation', familyTournamentParticipationSchema);
export default FamilyTournamentParticipation; 