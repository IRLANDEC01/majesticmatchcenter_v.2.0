import mongoose, { Schema, models } from 'mongoose';
import { CURRENCY_VALUES, RESULT_TIERS_ENUM } from '@/lib/constants';

const FamilyEarningSchema = new Schema(
  {
    // Ссылка на семью, получившую приз
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    // Ссылка на турнир, в котором был получен приз
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    // Результат, за который получен приз
    tier: {
      type: String,
      enum: RESULT_TIERS_ENUM,
      comment: 'Категория результата (например, "winner").',
    },
    rank: {
      type: Number,
      min: 1,
      comment: 'Конкретное место (например, 1).',
    },
    // Валюта приза
    currency: {
      type: String,
      required: true,
      enum: CURRENCY_VALUES,
    },
    // Сумма приза
    amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default models.FamilyEarning || mongoose.model('FamilyEarning', FamilyEarningSchema); 