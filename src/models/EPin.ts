import mongoose, { Schema, Document } from 'mongoose';

export interface IEPin extends Document {
  pinCode: string;
  plan: mongoose.Types.ObjectId;
  value: number;
  status: 'unused' | 'used' | 'blocked';
  generatedBy: mongoose.Types.ObjectId; // Admin
  currentOwnerId: mongoose.Types.ObjectId;
  usedBy?: mongoose.Types.ObjectId;
  usedDate?: Date;
  transferHistory: {
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    date: Date;
  }[];
}

const epinSchema = new Schema<IEPin>({
  pinCode: { type: String, required: true, unique: true },
  plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  value: { type: Number, required: true },
  status: { type: String, enum: ['unused', 'used', 'blocked'], default: 'unused' },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  currentOwnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  usedDate: { type: Date },
  transferHistory: [{
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

epinSchema.index({ currentOwnerId: 1 });

export default mongoose.models.EPin || mongoose.model<IEPin>('EPin', epinSchema);
