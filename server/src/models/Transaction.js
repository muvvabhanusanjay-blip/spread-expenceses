import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true },
    merchant: { type: String, trim: true, maxlength: 80, default: '' },
    note: { type: String, trim: true, maxlength: 240, default: '' },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    tags: [{ type: String, trim: true, maxlength: 24 }],
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1, createdAt: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
