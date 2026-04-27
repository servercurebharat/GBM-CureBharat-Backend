import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  price: number;
  businessVolume: number; // The base amount for commission calculation
  isCommissionable: boolean;
  gstPercent: number;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    businessVolume: { type: Number, required: true },
    isCommissionable: { type: Boolean, default: true },
    gstPercent: { type: Number, default: 18 },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Plan: Model<IPlan> = mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);

export default Plan;
