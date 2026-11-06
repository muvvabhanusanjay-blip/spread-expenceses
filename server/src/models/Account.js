import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: {
      type: String,
      required: true,
      enum: ['checking', 'savings', 'credit', 'cash', 'investment'],
    },
    institution: { type: String, trim: true, maxlength: 60, default: '' },
    last4: { type: String, trim: true, maxlength: 4, default: '' },
    openingBalance: { type: Number, default: 0 },
    color: { type: String, default: '#7C8CF8' },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Account = mongoose.model('Account', accountSchema);
