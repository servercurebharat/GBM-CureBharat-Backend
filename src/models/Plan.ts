import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  price: number; // in paise
  businessVolume: number; // in paise
  isCommissionable: boolean;
  gstPercent: number;
  description: string;
  isActive: boolean;
}

const planSchema = new Schema<IPlan>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  businessVolume: { type: Number, required: true },
  isCommissionable: { type: Boolean, default: true },
  gstPercent: { type: Number, default: 18 },
  description: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', planSchema);
