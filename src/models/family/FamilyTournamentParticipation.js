import mongoose from 'mongoose';
import earningsSchema from '@/models/shared/earnings-schema';
import { RESULT_TIERS } from '@/lib/constants';

const { Schema } = mongoose;

const familyTournamentParticipationSchema = new Schema(
  {
    family: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    result: {
      tier: {
        type: String,
        enum: RESULT_TIERS,
        required: true,
        default: 'participant',
        comment: 'Категория/уровень результата (победитель, финалист, участник).',
      },
      rank: {
        type: Number,
        min: 1,
        sparse: true,
        comment: 'Числовое место в турнире, если применимо.',
      },
      points: {
        type: Number,
        sparse: true,
        comment: 'Итоговое количество очков в турнире, если применимо.',
      },
    },
    earnings: [earningsSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

familyTournamentParticipationSchema.index({ family: 1, tournament: 1 }, { unique: true });

const FamilyTournamentParticipation = mongoose.models.FamilyTournamentParticipation || mongoose.model('FamilyTournamentParticipation', familyTournamentParticipationSchema);

export default FamilyTournamentParticipation; 