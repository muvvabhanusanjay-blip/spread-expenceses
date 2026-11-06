import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    targetAmount: { type: Number, required: true, min: 1 },
    deadline: { type: String, default: null },
    color: { type: String, default: '#3EE8A7' },
    icon: { type: String, default: 'target' },
  },
  { timestamps: true }
);

export const Goal = mongoose.model('Goal', goalSchema);
