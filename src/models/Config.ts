import mongoose, { Schema, Document } from 'mongoose';

export interface IConfig extends Document {
  key: string;
  value: any;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  description: string;
}

const configSchema = new Schema<IConfig>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
  description: { type: String }
});

// Index for fast lookups by key
configSchema.index({ key: 1 });

export default mongoose.models.Config || mongoose.model<IConfig>('Config', configSchema);
