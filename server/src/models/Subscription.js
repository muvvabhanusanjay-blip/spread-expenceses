import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, default: 'subscriptions' },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    nextDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    active: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
