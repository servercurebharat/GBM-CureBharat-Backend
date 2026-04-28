import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
  policyId: string;
  customerName: string;
  customerMobile: string;
  plan: mongoose.Types.ObjectId;
  saleAmount: number; // in paise
  businessVolume: number; // in paise
  hccId: mongoose.Types.ObjectId;
  hcmId?: mongoose.Types.ObjectId;
  hbaId?: mongoose.Types.ObjectId;
  shId?: mongoose.Types.ObjectId;
  ePinCode?: string;
  paymentMethod: 'epin' | 'online';
  status: 'active' | 'cancelled';
  commissionProcessed: boolean;
  cycleMonth: string; // YYYY-MM
  createdAt: Date;
}

const saleSchema = new Schema<ISale>({
  policyId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerMobile: { type: String, required: true },
  plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  saleAmount: { type: Number, required: true },
  businessVolume: { type: Number, required: true },
  hccId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hcmId: { type: Schema.Types.ObjectId, ref: 'User' },
  hbaId: { type: Schema.Types.ObjectId, ref: 'User' },
  shId: { type: Schema.Types.ObjectId, ref: 'User' },
  ePinCode: { type: String },
  paymentMethod: { type: String, enum: ['epin', 'online'], default: 'epin' },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  commissionProcessed: { type: Boolean, default: false },
  cycleMonth: { type: String, required: true },
}, { timestamps: true });

saleSchema.index({ hccId: 1 });
saleSchema.index({ cycleMonth: 1 });

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', saleSchema);
