import mongoose, { Schema, models } from 'mongoose';
import earningsSchema from '@/models/shared/earnings-schema';

const FamilyTournamentParticipationSchema = new Schema(
  {
    // Ссылка на семью-участника
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    // Ссылка на турнир
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    // Итоговое место, занятое в турнире. null, если турнир не завершен.
    finalPlace: {
      type: Number,
      default: null,
    },
    // Суммарные призовые, заработанные семьей в этом турнире.
    // Используется как денормализованная витрина. Источник правды - FamilyEarning.
    earnings: {
      type: earningsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default models.FamilyTournamentParticipation || mongoose.model('FamilyTournamentParticipation', FamilyTournamentParticipationSchema); 