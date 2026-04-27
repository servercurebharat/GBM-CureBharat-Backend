import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEPin extends Document {
  pinCode: string;
  value: number;
  plan: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  status: 'unused' | 'used' | 'transferred' | 'expired';
  usedBy?: mongoose.Types.ObjectId; // The user who was registered/upgraded using this pin
  transferHistory: {
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    date: Date;
  }[];
  usedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EPinSchema: Schema = new Schema(
  {
    pinCode: { type: String, unique: true, required: true },
    value: { type: Number, required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['unused', 'used', 'transferred', 'expired'], default: 'unused' },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    transferHistory: [
      {
        from: { type: Schema.Types.ObjectId, ref: 'User' },
        to: { type: Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
      },
    ],
    usedDate: { type: Date },
  },
  { timestamps: true }
);

const EPin: Model<IEPin> = mongoose.models.EPin || mongoose.model<IEPin>('EPin', EPinSchema);

export default EPin;
