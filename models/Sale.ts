import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISale extends Document {
  policyId: string;
  seller: mongoose.Types.ObjectId; // The HCC who sold it
  plan: mongoose.Types.ObjectId;
  customerName: string;
  customerMobile: string;
  amount: number;
  businessVolume: number;
  commissionProcessed: boolean;
  cycleMonth: string; // YYYY-MM
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema: Schema = new Schema(
  {
    policyId: { type: String, unique: true, required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true },
    amount: { type: Number, required: true },
    businessVolume: { type: Number, required: true },
    commissionProcessed: { type: Boolean, default: false },
    cycleMonth: { type: String, required: true }, // Format: "2024-04"
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'completed' },
  },
  { timestamps: true }
);

const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);

export default Sale;
