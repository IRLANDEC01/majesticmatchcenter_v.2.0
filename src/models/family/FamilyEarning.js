import mongoose, { Schema, models } from 'mongoose';
import { CURRENCY_VALUES } from '@/lib/constants';

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
    // Место, за которое получен приз
    place: {
      type: Number,
      required: true,
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